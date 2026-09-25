import https from 'https';
import { applySecurity } from './_security.js';

const TMDB_API_KEY = "4e44d9029b1270a757cddc766a1bcb63";

function fetchUrl(url, timeoutMs = 8000) {
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
        if (loc.replace(/\/$/, '') === 'https://www.papadustream.club' || loc.replace(/\/$/, '') === 'https://papadustream.club') {
          return resolve({ status: 404, body: '', headers: res.headers, url });
        }
        return fetchUrl(loc, timeoutMs).then(resolve).catch(reject);
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

function fetchJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: timeoutMs
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Extraction des cartes de films/séries depuis l'HTML de Papadustream
function parseCardsFromHtml(html) {
  const cards = [];
  const regex = /<a\s+href="(\/(films|series)\/([^"]+))"\s+class="card">[\s\S]*?<img\s+src="([^"]+)"\s+alt="([^"]*)"[\s\S]*?(?:<div\s+class="card-title">([^<]*)<\/div>)?[\s\S]*?<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    cards.push({
      path: m[1],
      type: m[2] === 'series' ? 'tv' : 'movie',
      imdbId: m[3],
      poster: m[4],
      title: m[5] || m[6] || ''
    });
  }
  return cards;
}

// Extraction des animes depuis Anime-Sama
function parseAnimeCards(html) {
  const cards = [];
  const cardRegex = /<a[^>]+href=["'](https?:\/\/anime-sama\.(?:to|si)\/catalogue\/([a-zA-Z0-9_\-]+)\/?|\/catalogue\/([a-zA-Z0-9_\-]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  
  for (const match of html.matchAll(cardRegex)) {
    const slug = match[2] || match[3];
    if (!slug || slug === 'catalogue' || slug === 'search') continue;

    const inner = match[4];
    const titleMatch = inner.match(/<h2[^>]*class=["'][^"']*card-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
    const cardTitle = titleMatch ? titleMatch[1].trim() : slug;
    const imgMatch = inner.match(/<img[^>]+src=["']([^"']+)["']/i);

    cards.push({
      slug,
      title: cardTitle,
      poster: imgMatch ? imgMatch[1] : null
    });
  }
  return cards;
}

// Cache local mémoire en Vercel Serverless
const tmdbCache = new Map();
const feedCache = new Map();
const FEED_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// TMDB Genre ID to Papadustream slug
const GENRE_MAP = {
  "28": "action",
  "12": "adventure",
  "16": "animation",
  "35": "comedy",
  "80": "crime",
  "99": "documentary",
  "18": "drama",
  "10751": "family",
  "14": "fantasy",
  "36": "history",
  "27": "horror",
  "10402": "music",
  "9648": "mystery",
  "10749": "romance",
  "878": "sci-fi",
  "53": "thriller",
  "10752": "war",
  "37": "western",
  "10759": "action",
  "10765": "sci-fi"
};

// Enrichir les cartes avec TMDB en parallèle
async function enrichCardsWithTmdb(cards) {
  const promises = cards.map(async (c) => {
    if (tmdbCache.has(c.imdbId)) {
      return tmdbCache.get(c.imdbId);
    }
    const data = await fetchJson(`https://api.themoviedb.org/3/find/${c.imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=fr-FR`);
    const match = data?.movie_results?.[0] || data?.tv_results?.[0];
    let enriched;
    if (match) {
      enriched = {
        id: match.id,
        imdb_id: c.imdbId,
        title: match.title || match.name || c.title,
        name: match.name || match.title || c.title,
        overview: match.overview,
        poster_path: match.poster_path,
        backdrop_path: match.backdrop_path,
        vote_average: match.vote_average || 7.5,
        release_date: match.release_date || match.first_air_date || "",
        first_air_date: match.first_air_date || match.release_date || "",
        media_type: c.type,
        genre_ids: match.genre_ids || [],
        popularity: match.popularity || 10,
        original_language: match.original_language || "fr",
        is_verified_native: true
      };
    } else {
      enriched = {
        id: c.imdbId,
        imdb_id: c.imdbId,
        title: c.title,
        name: c.title,
        overview: "",
        poster_path: null,
        customPoster: c.poster,
        vote_average: 7.0,
        release_date: "",
        media_type: c.type,
        genre_ids: [],
        popularity: 10,
        original_language: "fr",
        is_verified_native: true
      };
    }
    tmdbCache.set(c.imdbId, enriched);
    return enriched;
  });

  return Promise.all(promises);
}

// Filtrage de pertinence pour la recherche
function filterRelevantResults(items, query) {
  const cleanQ = query.toLowerCase().trim();
  const qWords = cleanQ.split(/\s+/).filter(w => w.length >= 2);
  
  return items.filter(item => {
    const t = (item.title || item.name || '').toLowerCase();
    const orig = (item.original_title || item.original_name || '').toLowerCase();
    
    // Correspondance globale
    if (t.includes(cleanQ) || orig.includes(cleanQ)) return true;

    // Correspondance de chaque mot-clé principal
    if (qWords.length > 0 && qWords.every(w => t.includes(w) || orig.includes(w))) return true;

    return false;
  });
}

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

  const { action = 'home', page = 1, genre, q, category = 'all' } = req.query || {};

  try {
    // 1. ACTION: HOME
    if (action === 'home') {
      const cacheKey = 'home_feeds';
      const cached = feedCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < FEED_CACHE_TTL)) {
        return res.status(200).json(cached.data);
      }

      const [cinemaRes, topRes, seriesRes] = await Promise.all([
        fetchUrl('https://www.papadustream.club/cinema').catch(() => ({ body: '' })),
        fetchUrl('https://www.papadustream.club/top-films').catch(() => ({ body: '' })),
        fetchUrl('https://www.papadustream.club/series').catch(() => ({ body: '' }))
      ]);

      const cinemaCards = parseCardsFromHtml(cinemaRes.body).slice(0, 24);
      const topCards = parseCardsFromHtml(topRes.body).slice(0, 20);
      const seriesCards = parseCardsFromHtml(seriesRes.body).slice(0, 24);

      const [trendingMovies, topMovies, trendingSeries] = await Promise.all([
        enrichCardsWithTmdb(cinemaCards),
        enrichCardsWithTmdb(topCards),
        enrichCardsWithTmdb(seriesCards)
      ]);

      const data = {
        success: true,
        trendingMovies,
        topMovies,
        trendingSeries
      };

      feedCache.set(cacheKey, { timestamp: Date.now(), data });
      return res.status(200).json(data);
    }

    // 2. ACTION: MOVIES
    if (action === 'movies') {
      const pNum = parseInt(page, 10) || 1;
      let targetUrl = `https://www.papadustream.club/films?page=${pNum}`;

      if (genre) {
        const genreSlug = GENRE_MAP[genre] || genre.toLowerCase();
        targetUrl = `https://www.papadustream.club/genre/${genreSlug}?page=${pNum}`;
      } else if (pNum === 1) {
        targetUrl = 'https://www.papadustream.club/cinema';
      }

      const pageRes = await fetchUrl(targetUrl);
      const cards = parseCardsFromHtml(pageRes.body);
      const results = await enrichCardsWithTmdb(cards.slice(0, 30));

      return res.status(200).json({
        success: true,
        page: pNum,
        total_pages: 93,
        results
      });
    }

    // 3. ACTION: SERIES
    if (action === 'series') {
      const pNum = parseInt(page, 10) || 1;
      let targetUrl = `https://www.papadustream.club/series?page=${pNum}`;

      if (genre) {
        const genreSlug = GENRE_MAP[genre] || genre.toLowerCase();
        targetUrl = `https://www.papadustream.club/genre/${genreSlug}?page=${pNum}`;
      }

      const pageRes = await fetchUrl(targetUrl);
      const cards = parseCardsFromHtml(pageRes.body);
      const results = await enrichCardsWithTmdb(cards.slice(0, 30));

      return res.status(200).json({
        success: true,
        page: pNum,
        total_pages: 26,
        results
      });
    }

    // 4. ACTION: SEARCH
    if (action === 'search') {
      if (!q || !q.trim()) {
        return res.status(200).json({ success: true, results: [], total_results: 0 });
      }

      const queryClean = q.trim();
      let combinedResults = [];

      // A. Recherche Films & Séries sur Papadustream si catégorie != 'anime'
      if (category !== 'anime') {
        const searchRes = await fetchUrl(`https://www.papadustream.club/search?q=${encodeURIComponent(queryClean)}`);
        let cards = parseCardsFromHtml(searchRes.body);

        if (category === 'movie') {
          cards = cards.filter(c => c.type === 'movie');
        } else if (category === 'tv') {
          cards = cards.filter(c => c.type === 'tv');
        }

        const enriched = await enrichCardsWithTmdb(cards);
        // Filtrer strictement pour ne pas afficher des films sans rapport
        const filtered = filterRelevantResults(enriched, queryClean);
        combinedResults.push(...filtered);
      }

      // B. Recherche Anime sur Anime-Sama si catégorie == 'anime' ou 'all'
      if (category === 'anime' || category === 'all') {
        try {
          const animeSearchRes = await fetchUrl(`https://anime-sama.to/catalogue/?search=${encodeURIComponent(queryClean)}`, 4000);
          const animeCards = parseAnimeCards(animeSearchRes.body);
          
          for (const ac of animeCards.slice(0, 10)) {
            combinedResults.push({
              id: `as_${ac.slug}`,
              title: ac.title,
              name: ac.title,
              customPoster: ac.poster,
              poster_path: null,
              media_type: 'tv',
              original_language: 'ja',
              genre_ids: [16],
              source: 'anime-sama',
              animeSlug: ac.slug,
              vote_average: 8.5,
              is_verified_native: true
            });
          }
        } catch {
          // Anime-Sama timeout fallback
        }
      }

      // Trier par pertinence (les titres qui commencent par la requête en premier)
      const cleanLower = queryClean.toLowerCase();
      combinedResults.sort((a, b) => {
        const aTitle = (a.title || a.name || '').toLowerCase();
        const bTitle = (b.title || b.name || '').toLowerCase();
        const aStarts = aTitle.startsWith(cleanLower);
        const bStarts = bTitle.startsWith(cleanLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (b.popularity || 0) - (a.popularity || 0);
      });

      return res.status(200).json({
        success: true,
        results: combinedResults,
        total_results: combinedResults.length
      });
    }

    return res.status(400).json({ success: false, error: 'Action inconnue' });
  } catch (err) {
    console.error('[catalog] Erreur:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
