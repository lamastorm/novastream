// Service Trakt.tv & Sélections Thématiques Communautaires
// Permet d'explorer les listes cultes créées par la communauté (Heist, Mindfuck, Chrono Marvel, Pépites HBO, etc.)
import { tmdbApi } from "./tmdb.js";

export const traktLists = [
  {
    id: "mindfuck",
    name: "🧠 Mindfuck & Twists Cultes",
    description: "Les films aux retournements de situation légendaires (Shutter Island, Fight Club, Interstellar...)",
    query: "with_genres=9648,878&vote_average.gte=8&vote_count.gte=3000&sort_by=vote_average.desc",
    sampleTitles: [550, 11324, 157336, 77, 27205, 106646, 146233], // Fight Club, Shutter Island, Interstellar, Memento, Inception, Wolf of Wall Street, Prisoners
  },
  {
    id: "heist",
    name: "💰 Les Meilleurs Films de Braquage",
    description: "Braquages millimétrés, casinos et casses du siècle (Heat, Ocean's Eleven, The Town, Baby Driver...)",
    query: "with_genres=80,53&with_keywords=10051|9717&sort_by=popularity.desc",
    sampleTitles: [949, 161, 23168, 339403, 111, 298, 274, 497], // Heat, Ocean's 11, The Town, Baby Driver, Scarface, Ocean's 12, Silence of the Lambs, The Green Mile
  },
  {
    id: "scifi_gems",
    name: "🚀 Pépites Science-Fiction & Espace",
    description: "Les voyages spatiaux, futurs dystopiques et pépites SF acclamées",
    query: "with_genres=878&vote_average.gte=7.8&vote_count.gte=2000&sort_by=vote_average.desc",
    sampleTitles: [157336, 335984, 264660, 603, 62, 1891, 11], // Interstellar, Blade Runner 2049, Ex Machina, Matrix, 2001, Empire Strikes Back, Star Wars IV
  },
  {
    id: "hbo_prestige",
    name: "👑 Les Séries Chef-d'œuvre (HBO / FX)",
    description: "Les plus grandes séries dramatiques de l'histoire (Breaking Bad, Chernobyl, The Wire, Game of Thrones...)",
    isTv: true,
    sampleTitles: [1396, 87108, 1438, 1399, 100088, 76479, 94605], // Breaking Bad, Chernobyl, The Wire, Game of Thrones, The Last of Us, The Boys, Arcane
  },
  {
    id: "cyberpunk",
    name: "🌆 Cyberpunk & Néo-Noir",
    description: "Villes futuristes sous la pluie, néons et intelligences artificielles",
    query: "with_genres=878,53&sort_by=vote_average.desc",
    sampleTitles: [78, 335984, 603, 264660, 18, 438631, 9377], // Blade Runner, Blade Runner 2049, Matrix, Ex Machina, The Fifth Element, Dune, Ferris
  }
];

export const traktApi = {
  getLists: () => traktLists,

  getListItems: async (listId) => {
    const list = traktLists.find((l) => l.id === listId);
    if (!list) return [];

    try {
      // Fetch TMDB details for the curated IDs
      const promises = list.sampleTitles.map(async (id) => {
        try {
          const type = list.isTv ? "tv" : "movie";
          const data = await tmdbApi.getDetails(type, id);
          return { ...data, media_type: type, source: "trakt" };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter(Boolean);
    } catch (e) {
      console.error("Erreur Trakt Curated List:", e);
      return [];
    }
  },
};
