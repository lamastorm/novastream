// Service de gestion du Catalogue Erodium Natif (100% Vérifié & 0 Pub)
// Garantit qu'aucun média non disponible n'est affiché à l'utilisateur.

const memoryCache = new Map();

export const catalogProvider = {
  /**
   * Récupère les flux de la page d'accueil (Tendances Films, Top Films, Séries populaires)
   */
  async getHomeFeeds() {
    const cacheKey = 'home_feeds';
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    try {
      const res = await fetch('/api/catalog?action=home');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.success) {
        memoryCache.set(cacheKey, data);
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[catalogProvider] Erreur getHomeFeeds:', err.message);
      return null;
    }
  },

  /**
   * Récupère la liste des films vérifiés par page et par genre
   */
  async getMovies({ page = 1, genre = null } = {}) {
    const cacheKey = `movies_p${page}_g${genre || 'all'}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        action: 'movies',
        page: String(page),
      });
      if (genre) params.set('genre', String(genre));

      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.success) {
        memoryCache.set(cacheKey, data);
        return data;
      }
      return { results: [], page, total_pages: 1 };
    } catch (err) {
      console.warn('[catalogProvider] Erreur getMovies:', err.message);
      return { results: [], page, total_pages: 1 };
    }
  },

  /**
   * Récupère la liste des séries vérifiées par page et par genre
   */
  async getSeries({ page = 1, genre = null } = {}) {
    const cacheKey = `series_p${page}_g${genre || 'all'}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        action: 'series',
        page: String(page),
      });
      if (genre) params.set('genre', String(genre));

      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.success) {
        memoryCache.set(cacheKey, data);
        return data;
      }
      return { results: [], page, total_pages: 1 };
    } catch (err) {
      console.warn('[catalogProvider] Erreur getSeries:', err.message);
      return { results: [], page, total_pages: 1 };
    }
  },

  /**
   * Recherche en direct dans le catalogue Erodium (Papadustream + Anime-Sama)
   * Ne retourne que les films, séries et animes réellement jouables sans pub
   */
  async search({ query, category = 'all', page = 1 } = {}) {
    if (!query || !query.trim()) {
      return { results: [], total_results: 0 };
    }

    const cleanQ = query.trim();
    const cacheKey = `search_${cleanQ.toLowerCase()}_${category}_p${page}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        action: 'search',
        q: cleanQ,
        category,
        page: String(page),
      });

      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.success) {
        memoryCache.set(cacheKey, data);
        return data;
      }
      return { results: [], total_results: 0 };
    } catch (err) {
      console.warn('[catalogProvider] Erreur search:', err.message);
      return { results: [], total_results: 0 };
    }
  },

  clearCache() {
    memoryCache.clear();
  }
};
