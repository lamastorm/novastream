// Service de résolution directe des Animés en VF & VOSTFR via Anime-Sama
// Fournit des lecteurs sans pub, sans coupure et avec le vrai doublage audio français officiel (Sibnet, Sendvid, Vidmoly)

const cache = new Map();

export const animeProvider = {
  /**
   * Résout le lien de streaming d'un épisode d'animé
   * @param {Object} params
   * @param {string} params.title Titre de l'animé (ex: "Sword Art Online")
   * @param {number} params.season Numéro de saison
   * @param {number} params.episode Numéro d'épisode
   * @param {string} params.lang 'vf' ou 'vostfr'
   */
  async getEpisodeStream({ title, season = 1, episode = 1, lang = 'vf' }) {
    if (!title) return { success: false, error: 'Titre manquant' };

    const cacheKey = `${title.toLowerCase().trim()}_s${season}_e${episode}_${lang}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const queryParams = new URLSearchParams({
        title,
        season: String(season),
        episode: String(episode),
        lang: lang || 'vf',
      });

      const res = await fetch(`/api/anime?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data && data.success) {
        cache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      console.warn('[animeProvider] Erreur de résolution Anime-Sama:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  },

  /**
   * Vérifie si un titre ou média est un animé japonais
   */
  isAnime(media) {
    if (!media) return false;
    const origLang = (media.original_language || '').toLowerCase();
    return (
      origLang === 'ja' ||
      media.source === 'anilist' ||
      media.source === 'mal' ||
      media.genre_ids?.includes(16) ||
      media.genres?.some((g) => g.id === 16)
    );
  }
};
