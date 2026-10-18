export const config = {
  runtime: 'edge',
};

function cleanQuery(str) {
  if (!str) return '';
  return str
    .replace(/\b(saison|season|episode|ep|vf|vostfr|hd|4k|1080p|720p)\b.*$/i, '')
    .trim();
}

const SEGMENT_TYPES = ['intro', 'recap', 'credits', 'preview'];

async function fetchSkipSegments({ tmdbId, type, season, episode }) {
  const numId = Number(tmdbId);
  if (!Number.isFinite(numId) || numId <= 0) return [];

  const params = new URLSearchParams({ tmdb_id: String(Math.trunc(numId)) });
  if (type === 'tv') {
    params.set('season', String(Math.trunc(Number(season) || 1)));
    params.set('episode', String(Math.trunc(Number(episode) || 1)));
  }

  try {
    const res = await fetch(`https://api.theintrodb.org/v3/media?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data === 'object') {
        const segments = [];
        for (const segType of SEGMENT_TYPES) {
          const list = data[segType];
          if (Array.isArray(list)) {
            for (const item of list) {
              const s = item?.start_ms == null ? 0 : Number(item.start_ms);
              const e = item?.end_ms == null ? null : Number(item.end_ms);
              if (Number.isFinite(s) && s >= 0 && (e == null || (Number.isFinite(e) && e > s))) {
                if (e != null && e - s < 5000) continue;
                segments.push({ type: segType, startMs: s, endMs: e });
              }
            }
          }
        }
        if (segments.length > 0) {
          return segments.sort((a, b) => a.startMs - b.startMs);
        }
      }
    }
  } catch {}

  try {
    const skyParams = new URLSearchParams({
      tmdbId: String(Math.trunc(numId)),
      type,
    });
    if (type === 'tv') {
      skyParams.set('season', String(Math.trunc(Number(season) || 1)));
      skyParams.set('episode', String(Math.trunc(Number(episode) || 1)));
    }
    const skyRes = await fetch(`https://skystream.fun/api/skip-segments?${skyParams.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://skystream.fun/',
      },
    });
    if (skyRes.ok) {
      const skyData = await skyRes.json().catch(() => null);
      if (Array.isArray(skyData?.segments)) {
        return skyData.segments;
      }
    }
  } catch {}

  return [];
}

const searchCache = new Map();
const streamCache = new Map();
const STREAM_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function resolveSkyStream({ title, year = null, type = 'movie', season = 1, episode = 1, tmdbId = null }) {
  if (!title) {
    return { success: false, error: 'Paramètre title manquant' };
  }

  const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
  const query = cleanQuery(title);
  const searchKey = `${query.toLowerCase()}_${mediaType}_${year || ''}`;
  const fullStreamKey = `${searchKey}_s${season}_e${episode}`;

  const cachedStream = streamCache.get(fullStreamKey);
  if (cachedStream && Date.now() - cachedStream.ts < STREAM_CACHE_TTL) {
    return cachedStream.data;
  }

  try {
    let match = searchCache.get(searchKey);

    if (!match) {
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
      if (year) {
        const yNum = parseInt(year, 10);
        match = candidates.find((i) => Math.abs(parseInt(i.year, 10) - yNum) <= 1);
      }
      if (!match) {
        match = candidates[0];
      }

      if (match) {
        if (searchCache.size > 500) searchCache.clear();
        searchCache.set(searchKey, match);
      }
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

    // Extraire tmdbId depuis l'URL CDN (ex: /tv/1399-noog8/ ou /movies/27205-izjy4/) ou depuis le paramètre
    let resolvedTmdbId = tmdbId;
    if (!resolvedTmdbId && streamUrl) {
      const m = streamUrl.match(/\/(?:tv|movies)\/(\d+)-/i);
      if (m) resolvedTmdbId = Number(m[1]);
    }
    if (!resolvedTmdbId && data.voUrl) {
      const m = data.voUrl.match(/\/embed\/(?:tv|movie)\/(\d+)/i);
      if (m) resolvedTmdbId = Number(m[1]);
    }

    // Ne jamais bloquer le démarrage de l'épisode plus de 300ms pour les segments d'intro
    // (HlsPlayer.jsx les récupère déjà en tâche de fond côté client)
    const skipSegments = await Promise.race([
      fetchSkipSegments({
        tmdbId: resolvedTmdbId,
        type: mediaType,
        season,
        episode,
      }),
      new Promise((resolve) => setTimeout(() => resolve([]), 300)),
    ]);

    const proxiedStreamUrl = streamUrl.includes('.m3u8')
      ? `/api/hls-proxy?v=2&url=${encodeURIComponent(streamUrl)}`
      : streamUrl;

    const proxiedSubtitles = (Array.isArray(data.subtitles) ? data.subtitles : []).map((sub) => ({
      ...sub,
      url: sub.url && sub.url.startsWith('http')
        ? `/api/hls-proxy?v=2&url=${encodeURIComponent(sub.url)}`
        : sub.url,
    }));

    const resultPayload = {
      success: true,
      streamUrl: proxiedStreamUrl,
      rawStreamUrl: streamUrl,
      format: data.format || (streamUrl.includes('.m3u8') ? 'hls' : 'mp4'),
      subtitles: proxiedSubtitles,
      audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks : [],
      skipSegments,
      tmdbId: resolvedTmdbId || null,
      title: match.title || title,
      year: match.year,
      provider: 'skystream',
    };

    if (streamCache.size > 500) streamCache.clear();
    streamCache.set(fullStreamKey, { ts: Date.now(), data: resultPayload });

    return resultPayload;
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
  const tmdbId = url.searchParams.get('tmdbId');

  const result = await resolveSkyStream({ title, year, type, season, episode, tmdbId });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
