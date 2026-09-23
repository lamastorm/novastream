// Conseiller intelligent d'adaptation linguistique et de disponibilité pour NovaStream
// Détecte automatiquement les œuvres sans doublage français officiel (séries thaïlandaises, dramas coréens/chinois, animés spécifiques)
// et redirige intelligemment vers VOSTFR ou Multi pour éviter les erreurs 404.

// Langues pour lesquelles un doublage français officiel n'est JAMAIS ou TRÈS RAREMENT produit
const NO_VF_LANGUAGES = [
  "th", // Thaïlande (ex: The Loyal Pin, BL/GL dramas)
  "tl", // Philippines (Tagalog)
  "vi", // Vietnam
  "id", // Indonésie
  "ms", // Malaisie
  "tr", // Turquie (Dizi / Telenovelas sauf rares exceptions Netflix)
  "hi", // Inde (Hindi)
  "ta", // Inde (Tamoul)
  "te", // Inde (Télougou)
  "zh", // Chine (Dramas historiques, Xianxia)
  "cn", // Chine (Cantonais)
];

// Langues où la VOSTFR est majoritaire
const VOSTFR_PREF_LANGUAGES = [
  ...NO_VF_LANGUAGES,
  "ko", // Corée du Sud (K-Dramas souvent non doublés en VF)
  "ja", // Japon (Animés & J-Dramas souvent VOSTFR)
];

export const languageAdvisor = {
  /**
   * Vérifie si l'œuvre est originaire d'un pays sans doublage VF officiel
   */
  hasNoOfficialVF: (media) => {
    if (!media) return false;
    const origLang = (media.original_language || "").toLowerCase();
    
    // Les productions francophones ont 100% de VF
    if (origLang === "fr") return false;

    // Détection formelle par code langue
    if (NO_VF_LANGUAGES.includes(origLang)) {
      return true;
    }

    // Séries / Dramas asiatiques non doublés
    if ((origLang === "ko" || origLang === "zh") && media.media_type === "tv") {
      return true;
    }

    // Animes japonais (langue originale ja + genre animation 16 ou source anime)
    const isAnime =
      origLang === "ja" &&
      (media.genre_ids?.includes(16) ||
        media.genres?.some((g) => g.id === 16) ||
        media.source === "anilist" ||
        media.source === "mal" ||
        media.media_type === "tv");

    if (isAnime) {
      return true;
    }

    return false;
  },

  /**
   * Détermine la langue recommandée pour cette œuvre
   */
  getRecommendedLanguage: (media) => {
    if (!media) return "vf";
    const origLang = (media.original_language || "").toLowerCase();

    if (origLang === "fr") return "vf";
    if (languageAdvisor.hasNoOfficialVF(media)) return "vostfr";

    // Si c'est un anime provenant d'AniList / MyAnimeList
    if (media.source === "anilist" || media.source === "mal") {
      return "vostfr";
    }

    // Par défaut, respecter le choix de l'utilisateur ou VF
    return localStorage.getItem("novastream_default_lang") || "vf";
  },

  /**
   * Fournit un message d'explication pédagogique pour l'utilisateur
   */
  getExplanation: (media) => {
    if (!media) return null;
    const origLang = (media.original_language || "").toLowerCase();

    switch (origLang) {
      case "th":
        return {
          title: "Série / Film Thaïlandais",
          message: "Cette production thaïlandaise n'a aucun doublage français officiel. Elle est disponible en VOSTFR Full HD avec sous-titres français complets.",
          badge: "VOSTFR Recommandée (Pas de VF)",
        };
      case "ko":
        return {
          title: "Production Sud-Coréenne",
          message: "Ce K-Drama est diffusé en version originale sous-titrée français (VOSTFR 1080p).",
          badge: "VOSTFR 1080p",
        };
      case "zh":
      case "cn":
        return {
          title: "Production Chinoise",
          message: "Cette série chinoise n'a pas de VF officielle : visionnage recommandé en VOSTFR Full HD.",
          badge: "VOSTFR HD",
        };
      case "ja":
        return {
          title: "Production Japonaise",
          message: "Animé / Série japonaise disponible en VOSTFR sous-titré français.",
          badge: "VOSTFR / VO",
        };
      case "tr":
        return {
          title: "Série Turque",
          message: "Cette telenovela / série turque est disponible en version originale sous-titrée (VOSTFR).",
          badge: "VOSTFR",
        };
      case "hi":
      case "ta":
      case "te":
        return {
          title: "Cinéma Indien",
          message: "Film indien disponible en VOSTFR sous-titré français.",
          badge: "VOSTFR",
        };
      case "fr":
        return {
          title: "Production Francophone",
          message: "Œuvre en version originale française (VF).",
          badge: "VF Originale 🇫🇷",
        };
      default:
        return {
          title: "Multi-Langues",
          message: "Disponible en Version Française (VF) et Version Originale Sous-Titrée (VOSTFR).",
          badge: "VF & VOSTFR",
        };
    }
  },
};
