// Service de résolution directe des films et séries via SkyStream
// Fournit des flux HLS (.m3u8) et MP4 directs haute fidélité 1080p FHD sans publicité et sans iframe

const cache = new Map();

export const skyStreamProvider = {
  /**
   * Recherche un média sur SkyStream par mot-clé
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async search(query) {
    if (!query || !query.trim()) return [];
    try {
      const res = await fetch(`https://skystream.fun/api/search?q=${encodeURIComponent(query.trim())}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.warn('[skyStreamProvider] Erreur lors de la recherche:', err.message);
      return [];
    }
  },

  /**
   * Résout le flux direct 1080p FHD pour un film ou une série
   * @param {Object} params
   * @param {string} params.title Titre du film ou de la série
   * @param {number|string} [params.year] Année de sortie (optionnel, pour cibler le bon film)
   * @param {string} [params.type] 'movie' ou 'tv'
   * @param {number} [params.season] Numéro de saison
   * @param {number} [params.episode] Numéro d'épisode
   */
  async getStream({ title, year = null, type = 'movie', season = 1, episode = 1 }) {
    if (!title) {
      return { success: false, error: 'Titre manquant' };
    }

    const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
    const cacheKey = `${title.toLowerCase().trim()}_${mediaType}_s${season}_e${episode}_${year || ''}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      // 1. Recherche du média sur SkyStream
      const items = await this.search(title);
      if (!items || items.length === 0) {
        return { success: false, error: `Titre « ${title} » introuvable sur SkyStream` };
      }

      // Filtrer par type (film ou série)
      const matchingType = items.filter(i => {
        if (mediaType === 'tv') {
          return i.kind === 'tv' || i.kind === 'anime';
        }
        return i.kind === 'movie';
      });

      const candidates = matchingType.length > 0 ? matchingType : items;

      // Meilleur match par année si renseignée
      let match = null;
      if (year) {
        const yNum = parseInt(year, 10);
        match = candidates.find(i => Math.abs(parseInt(i.year, 10) - yNum) <= 1);
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
        throw new Error(errData.error || `Erreur SkyStream ${playRes.status}`);
      }

      const data = await playRes.json();
      let streamUrl = null;

      // Priorité 1 : Extraction du flux direct m3u8 depuis le jeton de secours (CDN débridé sans proxy)
      if (data.fallbackUrl && data.fallbackUrl.includes('token=')) {
        try {
          const token = data.fallbackUrl.split('token=')[1];
          const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
          const jsonStr = typeof atob !== 'undefined'
            ? atob(b64)
            : Buffer.from(b64, 'base64').toString('utf8');
          const payload = JSON.parse(jsonStr);
          if (payload && payload.u && payload.u.startsWith('http')) {
            streamUrl = payload.u;
          }
        } catch (e) {
          console.warn('[skyStreamProvider] Erreur décodage jeton fallback:', e.message);
        }
      }

      // Priorité 2 : Flux principal fourni
      if (!streamUrl && data.url) {
        if (data.url.startsWith('http')) {
          streamUrl = data.url;
        } else {
          streamUrl = `https://skystream.fun${data.url.startsWith('/') ? '' : '/'}${data.url}`;
        }
      }

      if (!streamUrl) {
        return { success: false, error: 'Flux vidéo indisponible' };
      }

      const result = {
        success: true,
        streamUrl,
        format: data.format || (streamUrl.includes('.m3u8') ? 'hls' : 'mp4'),
        subtitles: Array.isArray(data.subtitles) ? data.subtitles : [],
        audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks : [],
        title: match.title || title,
        year: match.year,
        provider: 'skystream',
      };

      cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('[skyStreamProvider] Erreur lors de la résolution du flux:', err.message);
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
