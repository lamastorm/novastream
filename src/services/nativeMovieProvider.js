// Service de résolution directe des Films et Séries en flux HLS natif
// Fournit des flux 1080p Full HD directs sans pub, sans popup et sans iframe

const cache = new Map();

export const nativeMovieProvider = {
  /**
   * Résout le flux direct 1080p pour un film ou une série
   * @param {Object} params
   * @param {number|string} params.tmdbId ID TMDB du média
   * @param {string} [params.imdbId] ID IMDb (optionnel, ex: tt0137523)
   * @param {string} [params.type] 'movie' ou 'tv'
   * @param {number} [params.season] Numéro de saison (si série)
   * @param {number} [params.episode] Numéro d'épisode (si série)
   * @param {string} [params.title] Titre du média
   */
  async getStream({ tmdbId, imdbId, type = 'movie', season = 1, episode = 1, title = '' }) {
    if (!tmdbId && !imdbId) {
      return { success: false, error: 'Identifiant TMDB ou IMDb manquant' };
    }

    const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
    const cacheKey = `${imdbId || tmdbId}_${mediaType}_s${season}_e${episode}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const queryParams = new URLSearchParams({
        type: mediaType,
        season: String(season),
        episode: String(episode),
        title: title || '',
      });

      if (tmdbId) queryParams.set('tmdbId', String(tmdbId));
      if (imdbId) queryParams.set('imdbId', String(imdbId));

      const res = await fetch(`/api/movie?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data && data.success && data.streamUrl) {
        cache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      console.warn('[nativeMovieProvider] Erreur lors de la résolution du flux:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  },

  clearCache() {
    cache.clear();
  }
};
