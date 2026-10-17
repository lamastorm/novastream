const WATCHLIST_KEY = "novastream_watchlist";
const HISTORY_KEY = "novastream_history";

export const storage = {
  // Watchlist
  getWatchlist: () => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  },

  isInWatchlist: (id, type) => {
    const list = storage.getWatchlist();
    return list.some((item) => item.id === id && item.media_type === type);
  },

  toggleWatchlist: (item) => {
    const list = storage.getWatchlist();
    const targetType = item.media_type || (item.title ? "movie" : "tv");
    const targetId = String(item.id);

    const index = list.findIndex((i) => {
      const iType = i.media_type || (i.title ? "movie" : "tv");
      return String(i.id) === targetId && iType === targetType;
    });

    let updated;
    if (index >= 0) {
      updated = list.filter((_, i) => i !== index);
    } else {
      updated = [
        {
          id: item.id,
          title: item.title || item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          media_type: targetType,
          release_date: item.release_date || item.first_air_date,
          overview: item.overview,
          status: item.status || "plan_to_watch",
          addedAt: new Date().toISOString(),
        },
        ...list,
      ];
    }
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    return updated;
  },

  updateWatchlistStatus: (id, mediaType, status) => {
    const list = storage.getWatchlist();
    const updated = list.map((i) => {
      const type = i.media_type || (i.title ? "movie" : "tv");
      const targetType = mediaType || (i.title ? "movie" : "tv");
      if (i.id === id && type === targetType) {
        return { ...i, status };
      }
      return i;
    });
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    return updated;
  },

  // History (Recently watched)
  getHistory: () => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (!saved) return [];
      const list = JSON.parse(saved);
      if (!Array.isArray(list)) return [];
      // Auto-heal and normalize legacy history items
      return list.filter(Boolean).map((item) => {
        const isKnownTV =
          item.id === 1399 ||
          item.id === 94997 ||
          (item.title && item.title.toLowerCase().includes("game of thrones")) ||
          (item.name && item.name.toLowerCase().includes("game of thrones"));

        const isTV =
          isKnownTV ||
          item.media_type === "tv" ||
          Boolean(item.first_air_date && !item.release_date) ||
          Boolean(item.number_of_seasons) ||
          Boolean(item.seasons?.length) ||
          (Boolean(item.name) && !item.title) ||
          (Number(item.season) > 1 || Number(item.episode) > 1) ||
          item.source === "anime-sama" ||
          item.source === "anilist" ||
          item.source === "mal" ||
          String(item.id).startsWith("as_");

        const media_type = isTV ? "tv" : "movie";

        return {
          ...item,
          media_type,
          season: isTV ? (Number(item.season) || 1) : undefined,
          episode: isTV ? (Number(item.episode) || 1) : undefined,
        };
      });
    } catch {
      return [];
    }
  },

  addToHistory: (item, season = 1, episode = 1) => {
    const list = storage.getHistory();
    const isKnownTV =
      item.id === 1399 ||
      item.id === 94997 ||
      (item.title && item.title.toLowerCase().includes("game of thrones")) ||
      (item.name && item.name.toLowerCase().includes("game of thrones"));

    const isTV =
      isKnownTV ||
      item.media_type === "tv" ||
      Boolean(item.first_air_date && !item.release_date) ||
      Boolean(item.number_of_seasons) ||
      Boolean(item.seasons?.length) ||
      (Boolean(item.name) && !item.title) ||
      (Number(season) > 1 || Number(episode) > 1) ||
      item.source === "anime-sama" ||
      item.source === "anilist" ||
      item.source === "mal" ||
      String(item.id).startsWith("as_");

    const media_type = isTV ? "tv" : "movie";
    const targetTitle = item.title || item.name || "Titre inconnu";

    const existing = list.find((i) => String(i.id) === String(item.id));
    const filtered = list.filter(
      (i) => !(String(i.id) === String(item.id))
    );

    const savedPos = storage.getPlaybackPosition(
      item.id,
      media_type,
      isTV ? Number(season) || 1 : 1,
      isTV ? Number(episode) || 1 : 1
    );

    const updated = [
      {
        id: item.id,
        title: targetTitle,
        name: item.name || targetTitle,
        poster_path: item.poster_path || existing?.poster_path,
        backdrop_path: item.backdrop_path || existing?.backdrop_path,
        release_date: item.release_date || existing?.release_date,
        first_air_date: item.first_air_date || existing?.first_air_date,
        vote_average: item.vote_average || existing?.vote_average,
        media_type,
        season: isTV ? (Number(season) || 1) : undefined,
        episode: isTV ? (Number(episode) || 1) : undefined,
        currentTime: savedPos?.currentTime || 0,
        duration: savedPos?.duration || 0,
        progress: savedPos?.progress || 0,
        watchedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 30); // keep last 30

    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  },

  // Exact Playback Timestamp per Movie / Episode
  _getPosKey: (id, mediaType = "movie", season = 1, episode = 1) => {
    const isTV = mediaType === "tv" || mediaType === "anime" || Number(season) > 1 || Number(episode) > 1;
    return isTV
      ? `tv_${id}_s${Number(season) || 1}_e${Number(episode) || 1}`
      : `movie_${id}`;
  },

  savePlaybackPosition: (id, mediaType = "movie", season = 1, episode = 1, currentTime = 0, duration = 0) => {
    if (!id || !currentTime || currentTime < 3 || !isFinite(currentTime)) return;
    try {
      const raw = localStorage.getItem("erodium_playback_positions");
      const map = raw ? JSON.parse(raw) : {};
      const key = storage._getPosKey(id, mediaType, season, episode);
      const dur = duration && isFinite(duration) && duration > 0 ? duration : 0;
      const progress = dur > 0 ? Math.min(100, Math.round((currentTime / dur) * 100)) : 0;

      // If almost finished (> 96% or within last 25s of a >5min video), remove resume point so next play starts fresh
      if (dur > 300 && (currentTime >= dur - 25 || progress >= 97)) {
        delete map[key];
      } else {
        map[key] = {
          currentTime: Math.floor(currentTime),
          duration: Math.floor(dur),
          progress,
          updatedAt: Date.now(),
        };
      }
      localStorage.setItem("erodium_playback_positions", JSON.stringify(map));

      // Also sync progress onto the matching history entry
      const savedHist = localStorage.getItem(HISTORY_KEY);
      if (savedHist) {
        const list = JSON.parse(savedHist);
        if (Array.isArray(list)) {
          let changed = false;
          const updatedList = list.map((item) => {
            if (String(item.id) === String(id)) {
              changed = true;
              return {
                ...item,
                season: mediaType === "tv" ? (Number(season) || item.season || 1) : item.season,
                episode: mediaType === "tv" ? (Number(episode) || item.episode || 1) : item.episode,
                currentTime: Math.floor(currentTime),
                duration: Math.floor(dur),
                progress,
                watchedAt: new Date().toISOString(),
              };
            }
            return item;
          });
          if (changed) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedList));
          }
        }
      }
    } catch {}
  },

  getPlaybackPosition: (id, mediaType = "movie", season = 1, episode = 1) => {
    if (!id) return null;
    try {
      const raw = localStorage.getItem("erodium_playback_positions");
      if (!raw) return null;
      const map = JSON.parse(raw);
      const key = storage._getPosKey(id, mediaType, season, episode);
      return map[key] || null;
    } catch {
      return null;
    }
  },

  clearPlaybackPosition: (id, mediaType = "movie", season = 1, episode = 1) => {
    if (!id) return;
    try {
      const raw = localStorage.getItem("erodium_playback_positions");
      if (!raw) return;
      const map = JSON.parse(raw);
      const key = storage._getPosKey(id, mediaType, season, episode);
      if (map[key]) {
        delete map[key];
        localStorage.setItem("erodium_playback_positions", JSON.stringify(map));
      }
    } catch {}
  },

  clearHistory: () => {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem("erodium_playback_positions");
  },

  clearWatchlist: () => {
    localStorage.removeItem(WATCHLIST_KEY);
  },
};
