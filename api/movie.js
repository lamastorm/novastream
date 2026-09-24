import https from 'https';

function fetchUrl(url, maxRedirects = 5, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (!loc.startsWith('http')) {
          loc = new URL(loc, url).toString();
        }
        if (maxRedirects > 0) {
          return fetchUrl(loc, maxRedirects - 1, timeoutMs).then(resolve).catch(reject);
        }
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers, url }));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
  });
}

const TMDB_API_KEY = "4e44d9029b1270a757cddc766a1bcb63";

async function getImdbIdFromTmdb(type, tmdbId) {
  const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
  try {
    const res = await fetchUrl(url);
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      return data.imdb_id || null;
    }
  } catch (e) {
    console.error('Error fetching IMDb ID from TMDB:', e.message);
  }
  return null;
}

export async function resolveNativeMovieStream({ tmdbId, imdbId, type = 'movie', season = 1, episode = 1, title = '' }) {
  let finalImdbId = imdbId;
  const isSeries = type === 'tv' || type === 'series';

  if (!finalImdbId && tmdbId) {
    finalImdbId = await getImdbIdFromTmdb(type, tmdbId);
  }

  if (!finalImdbId) {
    return { success: false, error: 'Identifiant IMDb introuvable' };
  }

  try {
    if (isSeries) {
      const seriesUrl = `https://www.papadustream.club/series/${finalImdbId}`;
      const res = await fetchUrl(seriesUrl);
      if (res.status !== 200) {
        return { success: false, error: `Série non disponible (${res.status})`, imdbId: finalImdbId };
      }

      const sNum = parseInt(season, 10) || 1;
      const eNum = parseInt(episode, 10) || 1;

      // Extract EPISODES array
      const epMatch = res.body.match(/EPISODES\s*=\s*(\[[^\]]+\]);?/);
      if (epMatch) {
        try {
          const episodes = JSON.parse(epMatch[1]);
          const found = episodes.find(e => e.season === sNum && e.episode === eNum);
          if (found && found.url) {
            const rawUrl = found.url.startsWith('http') ? found.url : `https://www.papadustream.club${found.url}`;
            const streamUrl = `/api/hls-proxy?url=${encodeURIComponent(rawUrl)}`;
            return {
              success: true,
              streamUrl,
              rawStreamUrl: rawUrl,
              title: found.title || title,
              imdbId: finalImdbId,
              type: 'tv',
              season: sNum,
              episode: eNum,
              totalEpisodes: episodes.length
            };
          }
        } catch (jsonErr) {
          console.error('Error parsing EPISODES JSON:', jsonErr);
        }
      }

      // Fallback to initialSrc if season 1 episode 1
      if (sNum === 1 && eNum === 1) {
        const initMatch = res.body.match(/initialSrc\s*=\s*['"]([^'"]+)['"]/);
        if (initMatch) {
          const rawUrl = initMatch[1].startsWith('http') ? initMatch[1] : `https://www.papadustream.club${initMatch[1]}`;
          const streamUrl = `/api/hls-proxy?url=${encodeURIComponent(rawUrl)}`;
          return {
            success: true,
            streamUrl,
            rawStreamUrl: rawUrl,
            title,
            imdbId: finalImdbId,
            type: 'tv',
            season: 1,
            episode: 1
          };
        }
      }

      return {
        success: false,
        error: `Épisode S${sNum}E${eNum} non disponible pour cette série`,
        imdbId: finalImdbId
      };
    } else {
      // Movie
      const movieUrl = `https://www.papadustream.club/films/${finalImdbId}`;
      const res = await fetchUrl(movieUrl);
      if (res.status !== 200) {
        return { success: false, error: `Film non disponible (${res.status})`, imdbId: finalImdbId };
      }

      const initMatch = res.body.match(/initialSrc\s*=\s*['"]([^'"]+)['"]/);
      if (initMatch) {
        const rawUrl = initMatch[1].startsWith('http') ? initMatch[1] : `https://www.papadustream.club${initMatch[1]}`;
        const streamUrl = `/api/hls-proxy?url=${encodeURIComponent(rawUrl)}`;
        return {
          success: true,
          streamUrl,
          rawStreamUrl: rawUrl,
          title,
          imdbId: finalImdbId,
          type: 'movie'
        };
      }

      return {
        success: false,
        error: `Flux direct indisponible pour ce film`,
        imdbId: finalImdbId
      };
    }
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

  const { tmdbId, imdbId, type = 'movie', season = 1, episode = 1, title = '' } = req.query || {};

  if (!tmdbId && !imdbId) {
    return res.status(400).json({ success: false, error: 'Paramètre tmdbId ou imdbId requis' });
  }

  const result = await resolveNativeMovieStream({ tmdbId, imdbId, type, season, episode, title });
  return res.status(200).json(result);
}
