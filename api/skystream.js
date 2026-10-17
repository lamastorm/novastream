export const config = {
  runtime: 'edge',
};

function cleanQuery(str) {
  if (!str) return '';
  return str
    .replace(/\b(saison|season|episode|ep|vf|vostfr|hd|4k|1080p|720p)\b.*$/i, '')
    .trim();
}

export async function resolveSkyStream({ title, year = null, type = 'movie', season = 1, episode = 1 }) {
  if (!title) {
    return { success: false, error: 'Paramètre title manquant' };
  }

  const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
  const query = cleanQuery(title);

  try {
    // 1. Recherche du média sur SkyStream via Edge Runtime (bypasse Cloudflare sans 403)
    const searchRes = await fetch(`https://skystream.fun/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://skystream.fun/',
      },
    });

    if (!searchRes.ok) {
      return { success: false, error: `Erreur recherche SkyStream (${searchRes.status})` };
    }

    const searchData = await searchRes.json().catch(() => ({}));
    const items = Array.isArray(searchData.items) ? searchData.items : [];

    if (items.length === 0) {
      return { success: false, error: `Titre « ${title} » introuvable sur SkyStream` };
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
      },
      body: JSON.stringify(playPayload),
    });

    if (!playRes.ok) {
      const errData = await playRes.json().catch(() => ({}));
      return { success: false, error: errData.error || `Erreur lecture SkyStream (${playRes.status})` };
    }

    const data = await playRes.json();
    let streamUrl = null;

    // Priorité 1 : Extraction du flux direct m3u8 depuis le jeton fallback
    if (data.fallbackUrl && data.fallbackUrl.includes('token=')) {
      try {
        const token = new URL(data.fallbackUrl, 'https://skystream.fun').searchParams.get('token');
        if (token) {
          const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
          const jsonStr = typeof atob !== 'undefined'
            ? atob(b64)
            : Buffer.from(b64, 'base64').toString('utf8');
          const payload = JSON.parse(jsonStr);
          if (payload && payload.u && payload.u.startsWith('http')) {
            streamUrl = payload.u;
          }
        }
      } catch (e) {
        console.warn('[SkyStream Edge API] Erreur décodage jeton fallback:', e.message);
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

    const proxiedStreamUrl = streamUrl.includes('.m3u8')
      ? `/api/hls-proxy?v=2&url=${encodeURIComponent(streamUrl)}`
      : streamUrl;

    const proxiedSubtitles = (Array.isArray(data.subtitles) ? data.subtitles : []).map((sub) => ({
      ...sub,
      url: sub.url && sub.url.startsWith('http')
        ? `/api/hls-proxy?v=2&url=${encodeURIComponent(sub.url)}`
        : sub.url,
    }));

    return {
      success: true,
      streamUrl: proxiedStreamUrl,
      rawStreamUrl: streamUrl,
      format: data.format || (streamUrl.includes('.m3u8') ? 'hls' : 'mp4'),
      subtitles: proxiedSubtitles,
      audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks : [],
      title: match.title || title,
      year: match.year,
      provider: 'skystream',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const title = url.searchParams.get('title') || '';
  const year = url.searchParams.get('year');
  const type = url.searchParams.get('type') || 'movie';
  const season = parseInt(url.searchParams.get('season'), 10) || 1;
  const episode = parseInt(url.searchParams.get('episode'), 10) || 1;

  const result = await resolveSkyStream({ title, year, type, season, episode });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
