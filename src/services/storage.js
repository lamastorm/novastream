const WATCHLIST_KEY = "novastream_watchlist";
const HISTORY_KEY = "novastream_history";

export const storage = {
  // Watchlist
  getWatchlist: () => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
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
      // Auto-heal and normalize legacy history items
      return list.map((item) => {
        const isTV =
          item.media_type === "tv" ||
          Boolean(item.season !== undefined && item.episode !== undefined) ||
          Boolean(item.season > 1 || item.episode > 1) ||
          Boolean(item.first_air_date && !item.release_date);
        return {
          ...item,
          media_type: isTV ? "tv" : (item.media_type || "movie"),
        };
      });
    } catch {
      return [];
    }
  },

  addToHistory: (item, season = 1, episode = 1) => {
    const list = storage.getHistory();
    const isTV =
      item.media_type === "tv" ||
      Boolean(season > 1 || episode > 1) ||
      Boolean(item.season !== undefined && item.episode !== undefined) ||
      Boolean(item.number_of_seasons) ||
      Boolean(item.seasons?.length) ||
      Boolean(item.first_air_date && !item.release_date) ||
      Boolean(item.name && !item.title);
    const media_type = isTV ? "tv" : (item.media_type || "movie");
    const targetTitle = item.title || item.name || "Titre inconnu";

    const filtered = list.filter(
      (i) => !(String(i.id) === String(item.id) && (i.media_type === media_type || (!i.media_type && !item.media_type)))
    );

    const updated = [
      {
        id: item.id,
        title: targetTitle,
        name: item.name || targetTitle,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        media_type,
        season: isTV ? (Number(season) || 1) : undefined,
        episode: isTV ? (Number(episode) || 1) : undefined,
        watchedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 30); // keep last 30

    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  },

  clearHistory: () => {
    localStorage.removeItem(HISTORY_KEY);
  },

  clearWatchlist: () => {
    localStorage.removeItem(WATCHLIST_KEY);
  },
};
