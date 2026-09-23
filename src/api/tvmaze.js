// Service TVmaze API - Calendrier des sorties séries en direct
const TVMAZE_BASE_URL = "https://api.tvmaze.com";

export const tvmazeApi = {
  // Épisodes et séries diffusés aujourd'hui
  getScheduleToday: async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${TVMAZE_BASE_URL}/schedule?country=US&date=${today}`);
      if (!res.ok) throw new Error(`Erreur TVmaze ${res.status}`);
      const data = await res.json();
      
      // Filter out news/talk shows and keep unique fiction series with images
      const seen = new Set();
      return data
        .filter((item) => {
          if (!item.show || !item.show.image || item.show.type === "News") return false;
          if (seen.has(item.show.id)) return false;
          seen.add(item.show.id);
          return true;
        })
        .slice(0, 18)
        .map((item) => ({
          id: item.show.id,
          title: item.show.name,
          episode_name: item.name,
          season: item.season,
          episode_number: item.number,
          airtime: item.airtime,
          customPoster: item.show.image?.medium || item.show.image?.original,
          vote_average: item.show.rating?.average || 7.5,
          genres: item.show.genres || [],
          network: item.show.network?.name || item.show.webChannel?.name,
          overview: item.summary ? item.summary.replace(/<[^>]*>/g, "") : "",
          media_type: "tv",
          source: "tvmaze",
        }));
    } catch (err) {
      console.error("Erreur TVmaze API:", err);
      return [];
    }
  },
};
