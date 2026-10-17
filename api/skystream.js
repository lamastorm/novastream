import { applySecurity } from '../lib/security.js';

function cleanQuery(str) {
  if (!str) return '';
  return str
    .replace(/\b(saison|season|episode|ep|vf|vostfr|hd|4k|1080p|720p)\b.*$/i, '')
    .trim();
}

export async function resolveSkyStream({ title, year = null, type = 'movie', season = 1, episode = 1 }) {
  if (!title) {
    return { success: false, error: 'Titre manquant' };
  }

  const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
  const query = cleanQuery(title);

  try {
    // 1. Recherche du média sur SkyStream (via corsproxy.org pour contourner instantanément le blocage Cloudflare sur IP datacenter Vercel)
    let items = [];
    let proxyError = null;
    let proxyStatus = null;
    try {
      const proxyRes = await fetch(`https://corsproxy.org/?url=${encodeURIComponent(`https://skystream.fun/api/search?q=${encodeURIComponent(query)}`)}`, {
        signal: AbortSignal.timeout(4000),
      });
      proxyStatus = proxyRes.status;
      if (proxyRes.ok) {
        const searchData = await proxyRes.json().catch((err) => { proxyError = 'json_parse: ' + err.message; return {}; });
        if (Array.isArray(searchData.items) && searchData.items.length > 0) {
          items = searchData.items;
        } else {
          proxyError = 'no_items: ' + JSON.stringify(searchData);
        }
      } else {
        proxyError = 'not_ok: ' + proxyRes.status;
      }
    } catch (e) {
      proxyError = e.message;
    }

    let directStatus = null;
    let directError = null;
    if (items.length === 0) {
      try {
        const searchRes = await fetch(`https://skystream.fun/api/search?q=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://skystream.fun/',
          },
          signal: AbortSignal.timeout(4000),
        });
        directStatus = searchRes.status;
        if (searchRes.ok) {
          const searchData = await searchRes.json().catch(() => ({}));
          if (Array.isArray(searchData.items)) {
            items = searchData.items;
          }
        } else {
          directError = 'status ' + searchRes.status;
        }
      } catch (e) {
        directError = e.message;
      }
    }

    if (items.length === 0) {
      return { 
        success: false, 
        error: `Titre « ${title} » introuvable sur SkyStream`,
        debug: { query, proxyStatus, proxyError, directStatus, directError }
      };
    }

    // Filtrer par type (film ou série)
    const matchingType = items.filter((i) => {
      if (mediaType === 'tv') {
        return i.kind === 'tv' || i.kind === 'anime';
      }
      return i.kind === 'movie';
    });

    const candidates = matchingType.length > 0 ? matchingType : items;

    // Meilleur match par année si disponible
    let match = null;
    if (year) {
      const yNum = parseInt(year, 10);
      match = candidates.find((i) => Math.abs(parseInt(i.year, 10) - yNum) <= 1);
    }
    if (!match) {
      match = candidates[0];
    }

    // 2. Appel de l'API /api/play
    const playPayload = {
      id: String(match.id),
      type: mediaType,
    };

    if (mediaType === 'tv') {
      playPayload.season = parseInt(season, 10) || 1;
      playPayload.episode = parseInt(episode, 10) || 1;
    }

    const playRes = await fetch('https://skystream.fun/api/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `https://skystream.fun/${mediaType === 'tv' ? 'serie' : 'film'}/${match.id}`,
        'Origin': 'https://skystream.fun',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(playPayload),
    });

    if (!playRes.ok) {
      const errData = await playRes.json().catch(() => ({}));
      return { success: false, error: errData.error || `Erreur de lecture SkyStream (${playRes.status})` };
    }

    const data = await playRes.json();
    let streamUrl = null;

    // Priorité 1 : Extraction du flux direct m3u8 depuis le jeton fallback
    if (data.fallbackUrl && data.fallbackUrl.includes('token=')) {
      try {
        const token = new URL(data.fallbackUrl, 'https://skystream.fun').searchParams.get('token');
        if (token) {
          const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
          const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
          const payload = JSON.parse(jsonStr);
          if (payload && payload.u && payload.u.startsWith('http')) {
            streamUrl = payload.u;
          }
        }
      } catch (e) {
        console.warn('[SkyStream API] Erreur décodage jeton fallback:', e.message);
      }
    }

    // Priorité 2 : Flux direct fourni
    if (!streamUrl && data.url) {
      if (data.url.startsWith('http')) {
        streamUrl = data.url;
      } else {
        streamUrl = `https://skystream.fun${data.url.startsWith('/') ? '' : '/'}${data.url}`;
      }
    }

    if (!streamUrl) {
      return { success: false, error: 'Flux vidéo direct indisponible sur ce titre' };
    }

    return {
      success: true,
      streamUrl,
      format: data.format || (streamUrl.includes('.m3u8') ? 'hls' : 'mp4'),
      subtitles: Array.isArray(data.subtitles) ? data.subtitles : [],
      audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks : [],
      title: match.title || title,
      year: match.year,
      provider: 'skystream',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!applySecurity(req, res)) {
    return;
  }

  const { title, year, type = 'movie', season = 1, episode = 1 } = req.query || {};

  if (!title) {
    return res.status(400).json({ success: false, error: 'Paramètre title manquant' });
  }

  const result = await resolveSkyStream({
    title,
    year,
    type,
    season: parseInt(season, 10) || 1,
    episode: parseInt(episode, 10) || 1,
  });

  return res.status(200).json(result);
}
