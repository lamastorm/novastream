// Service de résolution directe des films et séries via SkyStream
// Fournit des flux HLS (.m3u8) et MP4 directs haute fidélité 1080p FHD sans publicité et sans iframe

const cache = new Map();
const inFlight = new Map();
const prefetchedPlaylists = new Set();

export const skyStreamProvider = {
  /**
   * Recherche un média sur SkyStream par mot-clé
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async search(query) {
    if (!query || !query.trim()) return [];
    try {
      const res = await fetch(`https://corsproxy.org/?url=${encodeURIComponent(`https://skystream.fun/api/search?q=${encodeURIComponent(query.trim())}`)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.items) && data.items.length > 0) return data.items;
      }
    } catch (e) {
      // Fallback direct
    }

    try {
      const res = await fetch(`https://skystream.fun/api/search?q=${encodeURIComponent(query.trim())}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
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
   */
  async getStream({ title, year = null, type = 'movie', season = 1, episode = 1, tmdbId = null }) {
    if (!title) {
      return { success: false, error: 'Titre manquant' };
    }

    const mediaType = (type === 'tv' || type === 'series') ? 'tv' : 'movie';
    const cacheKey = `${title.toLowerCase().trim()}_${mediaType}_s${season}_e${episode}_${year || ''}_${tmdbId || ''}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    if (inFlight.has(cacheKey)) {
      return inFlight.get(cacheKey);
    }

    const promise = this._resolveStreamInternal({ title, year, mediaType, season, episode, tmdbId, cacheKey })
      .finally(() => {
        inFlight.delete(cacheKey);
      });

    inFlight.set(cacheKey, promise);
    return promise;
  },

  /**
   * Précharge en arrière-plan le flux d'un épisode (et réchauffe sa playlist .m3u8)
   * pour un lancement instantané (0 latence) au clic sur Lecture ou Épisode suivant.
   */
  prefetchStream(params) {
    if (!params || !params.title) return;
    this.getStream(params)
      .then((res) => {
        if (res && res.success && res.streamUrl && !prefetchedPlaylists.has(res.streamUrl)) {
          prefetchedPlaylists.add(res.streamUrl);
          fetch(res.streamUrl).catch(() => {});
        }
      })
      .catch(() => {});
  },

  async _resolveStreamInternal({ title, year, mediaType, season, episode, tmdbId, cacheKey }) {
    // 1. Tenter la résolution via l'API interne /api/skystream (Edge Runtime)
    try {
      const params = new URLSearchParams({
        title,
        type: mediaType,
        season: String(season || 1),
        episode: String(episode || 1),
        v: '4',
      });
      if (year) params.append('year', String(year));
      if (tmdbId) params.append('tmdbId', String(tmdbId));

      const apiRes = await fetch(`/api/skystream?${params.toString()}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.success && data.streamUrl) {
          cache.set(cacheKey, data);
          return data;
        }
      }
    } catch (e) {
      console.warn('[skyStreamProvider] /api/skystream indisponible, essai direct:', e.message);
    }

    try {
      // 2. Fallback direct sur SkyStream
      const items = await this.search(title);
      if (!items || items.length === 0) {
        return { success: false, error: `Titre « ${title} » introuvable sur SkyStream` };
      }

      const matchingType = items.filter(i => {
        if (mediaType === 'tv') {
          return i.kind === 'tv' || i.kind === 'anime';
        }
        return i.kind === 'movie';
      });

      const candidates = matchingType.length > 0 ? matchingType : items;

      let match = null;
      if (year) {
        const yNum = parseInt(year, 10);
        match = candidates.find(i => Math.abs(parseInt(i.year, 10) - yNum) <= 1);
      }
      if (!match) {
        match = candidates[0];
      }

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
    inFlight.clear();
    prefetchedPlaylists.clear();
  }
};
