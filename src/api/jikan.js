// Service API MyAnimeList (via Jikan REST API v4) - 100% Gratuit, Aucune clé requise
const JIKAN_BASE_URL = "https://api.jikan.moe/v4";

export const jikanApi = {
  // Top All-Time Anime selon MyAnimeList
  getTopAnime: async (page = 1) => {
    try {
      const res = await fetch(`${JIKAN_BASE_URL}/top/anime?page=${page}&limit=20`, {
        headers: { "User-Agent": "NovaStreamOtakuApp/1.0" },
      });
      if (!res.ok) throw new Error(`Erreur Jikan ${res.status}`);
      const data = await res.json();
      return (data.data || []).map((anime) => ({
        id: anime.mal_id,
        mal_id: anime.mal_id,
        title: anime.title,
        title_japanese: anime.title_japanese,
        poster_path: null,
        customPoster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        vote_average: anime.score,
        episodes: anime.episodes,
        status: anime.status,
        year: anime.year,
        overview: anime.synopsis,
        genres: anime.genres || [],
        media_type: "tv",
        source: "mal",
      }));
    } catch (err) {
      console.warn("Jikan API indisponible, bascule automatique vers le classement All-Time AniList:", err);
      try {
        const fallbackRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query ($page: Int) {
                Page(page: $page, perPage: 20) {
                  media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
                    id
                    idMal
                    title {
                      romaji
                      english
                    }
                    coverImage {
                      large
                    }
                    averageScore
                    episodes
                    genres
                    description(asHtml: false)
                  }
                }
              }
            `,
            variables: { page },
          }),
        });
        const fallbackData = await fallbackRes.json();
        return (fallbackData.data?.Page?.media || []).map((anime) => ({
          id: anime.id,
          mal_id: anime.idMal,
          title: anime.title.romaji || anime.title.english,
          customPoster: anime.coverImage?.large,
          vote_average: anime.averageScore ? anime.averageScore / 10 : 8.5,
          episodes: anime.episodes,
          overview: anime.description,
          genres: anime.genres || [],
          media_type: "tv",
          source: "anilist",
        }));
      } catch (fallbackErr) {
        console.error("Erreur fallback anime:", fallbackErr);
        return [];
      }
    }
  },
};
