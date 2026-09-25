const DEFAULT_API_KEY = "4e44d9029b1270a757cddc766a1bcb63";
const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const getApiKey = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("novastream_tmdb_key") || DEFAULT_API_KEY;
  }
  return DEFAULT_API_KEY;
};

export const setCustomApiKey = (key) => {
  if (typeof window !== "undefined" && window.localStorage) {
    if (key && key.trim()) {
      localStorage.setItem("novastream_tmdb_key", key.trim());
    } else {
      localStorage.removeItem("novastream_tmdb_key");
    }
  }
};

const fetchFromTMDB = async (endpoint, params = {}, silent = false) => {
  const apiKey = getApiKey();
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    language: "fr-FR",
    ...params,
  });

  try {
    const res = await fetch(`${BASE_URL}${endpoint}?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error(`Erreur TMDB ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (!silent) console.error(`Erreur fetch TMDB [${endpoint}]:`, err);
    throw err;
  }
};

export const tmdbApi = {
  // --- FILMS ---
  getTrendingMovies: async (page = 1) => {
    return fetchFromTMDB("/trending/movie/week", { page });
  },
  getNowPlayingMovies: async (page = 1) => {
    return fetchFromTMDB("/movie/now_playing", { page });
  },
  getPopularMovies: async (page = 1) => {
    return fetchFromTMDB("/movie/popular", { page });
  },
  getTopRatedMovies: async (page = 1) => {
    return fetchFromTMDB("/movie/top_rated", { page });
  },

  // --- DISCOVER AVANCÉ (Films & Séries illimités) ---
  discoverMovies: async (page = 1, { genre, year, sortBy = "popularity.desc", minVote } = {}) => {
    const params = { page, sort_by: sortBy };
    if (genre) params.with_genres = genre;
    if (year) params.primary_release_year = year;
    if (minVote) params["vote_average.gte"] = minVote;
    if (sortBy === "vote_average.desc" || minVote) params["vote_count.gte"] = 80;
    return fetchFromTMDB("/discover/movie", params);
  },

  discoverTV: async (page = 1, { genre, year, sortBy = "popularity.desc", minVote } = {}) => {
    const params = { page, sort_by: sortBy };
    if (genre) params.with_genres = genre;
    if (year) params.first_air_date_year = year;
    if (minVote) params["vote_average.gte"] = minVote;
    if (sortBy === "vote_average.desc" || minVote) params["vote_count.gte"] = 40;
    return fetchFromTMDB("/discover/tv", params);
  },

  // --- SÉRIES ---
  getTrendingTV: async (page = 1) => {
    return fetchFromTMDB("/trending/tv/week", { page });
  },
  getPopularTV: async (page = 1) => {
    return fetchFromTMDB("/tv/popular", { page });
  },
  getOnTheAirTV: async (page = 1) => {
    return fetchFromTMDB("/tv/on_the_air", { page });
  },
  getAiringTodayTV: async (page = 1) => {
    return fetchFromTMDB("/tv/airing_today", { page });
  },
  getUpcomingMovies: async (page = 1) => {
    return fetchFromTMDB("/movie/upcoming", { page });
  },

  // --- ANIMES (Japonais, Genre Animation ID 16) ---
  getPopularAnime: async (page = 1) => {
    return fetchFromTMDB("/discover/tv", {
      with_genres: 16,
      with_original_language: "ja",
      sort_by: "popularity.desc",
      page,
    });
  },
  getTopRatedAnime: async (page = 1) => {
    return fetchFromTMDB("/discover/tv", {
      with_genres: 16,
      with_original_language: "ja",
      sort_by: "vote_average.desc",
      "vote_count.gte": 250,
      page,
    });
  },
  getRecentAnime: async (page = 1) => {
    const today = new Date().toISOString().split("T")[0];
    return fetchFromTMDB("/discover/tv", {
      with_genres: 16,
      with_original_language: "ja",
      sort_by: "first_air_date.desc",
      "first_air_date.lte": today,
      page,
    });
  },
  getAnimeActionShonen: async (page = 1) => {
    return fetchFromTMDB("/discover/tv", {
      with_genres: "16,10759", // Animation + Action/Aventure
      with_original_language: "ja",
      sort_by: "popularity.desc",
      page,
    });
  },
  getAnimeFantasyIsekai: async (page = 1) => {
    return fetchFromTMDB("/discover/tv", {
      with_genres: "16,10765", // Animation + Sci-Fi & Fantasy
      with_original_language: "ja",
      sort_by: "popularity.desc",
      page,
    });
  },
  getAnimeMovies: async (page = 1) => {
    return fetchFromTMDB("/discover/movie", {
      with_genres: 16,
      with_original_language: "ja",
      sort_by: "popularity.desc",
      page,
    });
  },

  // --- PAR PLATEFORME (Networks) ---
  getByNetwork: async (networkId, page = 1) => {
    return fetchFromTMDB("/discover/tv", {
      with_networks: networkId,
      sort_by: "popularity.desc",
      page,
    });
  },

  // --- DISPONIBILITÉ EN FRANCE (JUSTWATCH / WATCH PROVIDERS) ---
  getWatchProviders: async (type, id) => {
    try {
      const data = await fetchFromTMDB(`/${type}/${id}/watch/providers`, {}, true);
      return data.results?.FR?.flatrate || data.results?.FR?.buy || [];
    } catch {
      return [];
    }
  },

  // --- DÉTAILS & IDS EXTERNES (IMDb) ---
  getDetails: async (type, id) => {
    return fetchFromTMDB(`/${type}/${id}`, {
      append_to_response: "videos,credits,similar,recommendations,external_ids",
    });
  },

  getExternalIds: async (type, id) => {
    return fetchFromTMDB(`/${type}/${id}/external_ids`, {}, true);
  },

  // --- SAISON & ÉPISODES (pour séries et animes) ---
  getSeasonEpisodes: async (tvId, seasonNumber) => {
    return fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`);
  },

  // --- RECHERCHE AVANCÉE (Sans double encodage) ---
  searchMulti: async (query, page = 1) => {
    if (!query || !query.trim()) return { results: [], total_pages: 0, total_results: 0 };
    return fetchFromTMDB("/search/multi", {
      query: query.trim(),
      include_adult: false,
      page,
    });
  },

  searchMovies: async (query, page = 1) => {
    if (!query || !query.trim()) return { results: [], total_pages: 0, total_results: 0 };
    return fetchFromTMDB("/search/movie", {
      query: query.trim(),
      include_adult: false,
      page,
    });
  },

  searchTV: async (query, page = 1) => {
    if (!query || !query.trim()) return { results: [], total_pages: 0, total_results: 0 };
    return fetchFromTMDB("/search/tv", {
      query: query.trim(),
      include_adult: false,
      page,
    });
  },

  // --- SAGAS & COLLECTIONS (Harry Potter, Annabelle, etc.) ---
  getCollection: async (collectionId) => {
    try {
      return await fetchFromTMDB(`/collection/${collectionId}`);
    } catch (e) {
      return null;
    }
  },

  // --- PAR PLATEFORME FILMS (JustWatch Provider) ---
  getByPlatformMovies: async (providerId, page = 1) => {
    return fetchFromTMDB("/discover/movie", {
      with_watch_providers: providerId,
      watch_region: "FR",
      sort_by: "popularity.desc",
      page,
    });
  },

  // --- GENRES ---
  getByGenre: async (type, genreId, page = 1) => {
    const endpoint = type === "movie" ? "/discover/movie" : "/discover/tv";
    return fetchFromTMDB(endpoint, {
      with_genres: genreId,
      sort_by: "popularity.desc",
      page,
    });
  },

  // --- RECHERCHE MULTI-CRITÈRES FILMS (Filtres, Année, Tri, Note, Plateformes) ---
  discoverMovies: async (page = 1, filters = {}) => {
    const {
      genre,
      platform,
      year,
      sortBy = "popularity.desc",
      minRating,
    } = filters;

    const params = {
      page,
      sort_by: sortBy,
      include_adult: false,
    };

    const today = new Date().toISOString().split("T")[0];

    // Ajustements selon le tri
    if (sortBy === "vote_average.desc") {
      params["vote_count.gte"] = 100;
    } else if (sortBy === "primary_release_date.desc") {
      params["primary_release_date.lte"] = today;
      params["vote_count.gte"] = 5;
    }

    // Plateforme de streaming (France)
    if (platform) {
      params.with_watch_providers = platform;
      params.watch_region = "FR";
    }

    // Genre
    if (genre) {
      params.with_genres = genre;
    }

    // Année de sortie ou décennie
    if (year) {
      const yNum = Number(year);
      if (yNum === 2000) {
        params["primary_release_date.gte"] = "2000-01-01";
        params["primary_release_date.lte"] = "2009-12-31";
      } else if (yNum === 1990) {
        params["primary_release_date.gte"] = "1990-01-01";
        params["primary_release_date.lte"] = "1999-12-31";
      } else if (!isNaN(yNum) && yNum > 1900) {
        params.primary_release_year = yNum;
      }
    }

    // Note minimale
    if (minRating) {
      const rNum = Number(minRating);
      if (!isNaN(rNum) && rNum > 0) {
        params["vote_average.gte"] = rNum;
        if (!params["vote_count.gte"] || params["vote_count.gte"] < 30) {
          params["vote_count.gte"] = 30;
        }
      }
    }

    return fetchFromTMDB("/discover/movie", params);
  },

  // --- RECHERCHE MULTI-CRITÈRES SÉRIES (Filtres, Année, Tri, Note, Plateformes) ---
  discoverTV: async (page = 1, filters = {}) => {
    const {
      genre,
      platform,
      year,
      sortBy = "popularity.desc",
      minRating,
    } = filters;

    let sortParam = sortBy;
    if (sortParam === "primary_release_date.desc") {
      sortParam = "first_air_date.desc";
    }

    const params = {
      page,
      sort_by: sortParam,
      include_adult: false,
    };

    const today = new Date().toISOString().split("T")[0];

    if (sortParam === "vote_average.desc") {
      params["vote_count.gte"] = 50;
    } else if (sortParam === "first_air_date.desc") {
      params["first_air_date.lte"] = today;
      params["vote_count.gte"] = 5;
    }

    // Plateforme de streaming (France)
    if (platform) {
      params.with_watch_providers = platform;
      params.watch_region = "FR";
    }

    // Genre
    if (genre) {
      params.with_genres = genre;
    }

    // Année de diffusion ou décennie
    if (year) {
      const yNum = Number(year);
      if (yNum === 2000) {
        params["first_air_date.gte"] = "2000-01-01";
        params["first_air_date.lte"] = "2009-12-31";
      } else if (yNum === 1990) {
        params["first_air_date.gte"] = "1990-01-01";
        params["first_air_date.lte"] = "1999-12-31";
      } else if (!isNaN(yNum) && yNum > 1900) {
        params.first_air_date_year = yNum;
      }
    }

    // Note minimale
    if (minRating) {
      const rNum = Number(minRating);
      if (!isNaN(rNum) && rNum > 0) {
        params["vote_average.gte"] = rNum;
        if (!params["vote_count.gte"] || params["vote_count.gte"] < 20) {
          params["vote_count.gte"] = 20;
        }
      }
    }

    return fetchFromTMDB("/discover/tv", params);
  },

  // --- MODE RANDOM (Surprenez-moi) ---
  getRandomSurprise: async () => {
    // Pick random page from top rated movies or anime
    const isAnime = Math.random() > 0.5;
    const randomPage = Math.floor(Math.random() * 5) + 1;
    
    if (isAnime) {
      const res = await tmdbApi.getPopularAnime(randomPage);
      const items = res.results || [];
      const chosen = items[Math.floor(Math.random() * items.length)];
      return { ...chosen, media_type: "tv" };
    } else {
      const res = await tmdbApi.getPopularMovies(randomPage);
      const items = res.results || [];
      const chosen = items[Math.floor(Math.random() * items.length)];
      return { ...chosen, media_type: "movie" };
    }
  },
  getPersonCredits: async (personId) => {
    const [movies, tv] = await Promise.all([
      fetchFromTMDB(`/person/${personId}/movie_credits`, {}, true),
      fetchFromTMDB(`/person/${personId}/tv_credits`, {}, true),
    ]);
    const movieResults = (movies.cast || [])
      .filter((m) => m.poster_path)
      .map((m) => ({ ...m, media_type: "movie" }));
    const tvResults = (tv.cast || [])
      .filter((m) => m.poster_path)
      .map((m) => ({ ...m, media_type: "tv" }));
    return [...movieResults, ...tvResults].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0)
    );
  },
};
