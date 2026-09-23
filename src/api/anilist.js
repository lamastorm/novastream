// Service API AniList (GraphQL) - 100% Gratuit, Aucune clé requise
const ANILIST_URL = "https://graphql.anilist.co";

const runAniListQuery = async (query, variables = {}) => {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Erreur AniList ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error("Erreur AniList API:", err);
    throw err;
  }
};

export const anilistApi = {
  // Tendances actuelles (Simulcasts & Animes les plus suivis)
  getTrending: async (page = 1, perPage = 20) => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
            averageScore
            format
            episodes
            status
            seasonYear
            season
            genres
            studios(isMain: true) {
              nodes {
                name
              }
            }
            description(asHtml: false)
          }
        }
      }
    `;
    const data = await runAniListQuery(query, { page, perPage });
    return data?.Page?.media || [];
  },

  // Animes de la saison en cours
  getThisSeason: async (page = 1, perPage = 20) => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING, isAdult: false) {
            id
            idMal
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            bannerImage
            averageScore
            episodes
            genres
            studios(isMain: true) {
              nodes {
                name
              }
            }
            description(asHtml: false)
          }
        }
      }
    `;
    const data = await runAniListQuery(query, { page, perPage });
    return data?.Page?.media || [];
  },

  // Filtre par Studio (MAPPA, Ufotable, Wit Studio, Madhouse, Bones)
  getByStudio: async (studioName, page = 1, perPage = 20) => {
    const query = `
      query ($search: String) {
        Studio(search: $search) {
          name
          media(sort: POPULARITY_DESC, isAdult: false) {
            nodes {
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
      }
    `;
    const data = await runAniListQuery(query, { search: studioName });
    return data?.Studio?.media?.nodes || [];
  },
};
