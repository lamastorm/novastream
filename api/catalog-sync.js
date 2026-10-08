// NovaStream / Erodium Autonomous Catalog Sync Bot
// Ce bot inspecte la base de données Supabase et les flux TMDB pour détecter
// automatiquement les nouveaux films et séries sortis et actualiser la bibliothèque.

const TMDB_API_KEY = "4e44d9029b1270a757cddc766a1bcb63";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL || 'https://vubbzlwdnhrbbpdegnhx.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  try {
    // 1. Ping & Keep-Alive de la base de données Supabase
    const dbHeaders = { 'User-Agent': 'Erodium-CatalogBot/2.0' };
    if (supabaseKey) {
      dbHeaders['apikey'] = supabaseKey;
      dbHeaders['Authorization'] = `Bearer ${supabaseKey}`;
    }
    const dbPing = await fetch(`${supabaseUrl}/rest/v1/`, { headers: dbHeaders }).catch(() => ({ status: 500 }));

    // 2. Scan des nouveautés TMDB (Dernières sorties cinéma & tendances du jour)
    const [trendingRes, nowPlayingRes, upcomingRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=fr-FR`).then(r => r.json()).catch(() => null),
      fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`).then(r => r.json()).catch(() => null),
      fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`).then(r => r.json()).catch(() => null)
    ]);

    const allScanned = [
      ...(trendingRes?.results || []),
      ...(nowPlayingRes?.results || []),
      ...(upcomingRes?.results || [])
    ];

    // 3. Filtrage haute qualité (Backdrop HD, popularité réelle, exclusion des fakes)
    const seen = new Set();
    const verifiedNewReleases = [];

    for (const item of allScanned) {
      if (!item || !item.id || seen.has(item.id)) continue;
      if (!item.backdrop_path && !item.poster_path) continue;

      const pop = Number(item.popularity) || 0;
      const votes = Number(item.vote_count) || 0;
      const voteAvg = Number(item.vote_average) || 0;
      const relYear = item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : 0;

      // Éliminer les titres non pertinents ou faux scores
      if (voteAvg >= 8.8 && votes < 30 && pop < 25) continue;
      if (relYear > 0 && relYear < 2023 && pop < 20 && votes < 50) continue;
      if (pop < 12 && votes < 15) continue;

      seen.add(item.id);
      verifiedNewReleases.push({
        id: item.id,
        title: item.title || item.name,
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        vote_count: item.vote_count,
        release_date: item.release_date,
        popularity: item.popularity,
        media_type: 'movie',
        is_verified_bot: true,
        scanned_at: new Date().toISOString()
      });
    }

    // 4. Tentative d'enregistrement dans Supabase si la table existe
    let supabaseUpsertStatus = 'skipped_or_unconfigured';
    if (supabaseKey && verifiedNewReleases.length > 0) {
      try {
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/catalog_movies`, {
          method: 'POST',
          headers: {
            ...dbHeaders,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(verifiedNewReleases.slice(0, 20))
        });
        supabaseUpsertStatus = insertRes.ok ? 'synced' : `table_status_${insertRes.status}`;
      } catch (err) {
        supabaseUpsertStatus = `error: ${err.message}`;
      }
    }

    const durationMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      bot: {
        name: 'Erodium AI Autonomous Catalog Bot',
        status: 'active_running',
        frequency: 'continuous_cron',
        databaseConnected: dbPing.status === 200 || dbPing.status === 401 || dbPing.status === 403,
        supabaseStatus: supabaseUpsertStatus,
        totalScanned: allScanned.length,
        verifiedReleasesAdded: verifiedNewReleases.length,
        topReleases: verifiedNewReleases.slice(0, 5).map(m => ({
          title: m.title,
          pop: m.popularity,
          score: m.vote_average,
          year: m.release_date?.slice(0, 4)
        })),
        executionTimeMs: durationMs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
