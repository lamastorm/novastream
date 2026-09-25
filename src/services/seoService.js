/**
 * Service de gestion dynamique du référencement (SEO) et des Rich Snippets Schema.org
 */

const BASE_URL = "https://erodium.vercel.app";
const DEFAULT_TITLE = "Erodium • Streaming Gratuit VF & VOSTFR sans Pub (Films, Séries, Animes)";
const DEFAULT_DESC = "Regardez vos films, séries et animes préférés en streaming HD 1080p et 4K VF / VOSTFR sans publicité intrusive, sans inscription et sans coupure sur Erodium.";

export const seoService = {
  /**
   * Met à jour le titre et la meta description en fonction de l'onglet actif ou de la recherche
   */
  updatePageMeta({ activeTab = "home", searchQuery = "" } = {}) {
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      document.title = `${q} en Streaming VF & VOSTFR Gratuit HD • Erodium`;
      this.setMetaDescription(`Regarder ${q} en streaming HD VF et VOSTFR complet et gratuit sans pub sur Erodium. Tous les épisodes et films disponibles sans coupure.`);
      return;
    }

    switch (activeTab) {
      case "movies":
        document.title = "Films en Streaming VF & VOSTFR Gratuit HD (Sans Pub) • Erodium";
        this.setMetaDescription("Découvrez les meilleurs films en streaming VF et VOSTFR en haute définition 1080p et 4K. Nouveautés cinéma, classiques et blockbusters gratuits sans inscription.");
        break;
      case "series":
        document.title = "Séries en Streaming VF Gratuit et Complet (Saisons Entières) • Erodium";
        this.setMetaDescription("Toutes vos séries préférées en streaming VF et VOSTFR complet et gratuit sans publicité. Netflix, Prime Video, Apple TV+, Canal+ en accès direct.");
        break;
      case "anime":
        document.title = "Animes en Streaming VOSTFR & VF HD (Catalogue Anime-Sama) • Erodium";
        this.setMetaDescription("Regardez One Piece, Jujutsu Kaisen, Demon Slayer et tout le catalogue anime en streaming VOSTFR et VF sans coupure et sans pub sur Erodium.");
        break;
      case "favorites":
        document.title = "Ma Liste & Favoris • Erodium Streaming";
        this.setMetaDescription("Retrouvez vos films, séries et animes enregistrés dans votre watchlist personnelle sur Erodium.");
        break;
      default:
        document.title = DEFAULT_TITLE;
        this.setMetaDescription(DEFAULT_DESC);
        break;
    }

    this.removeMediaSchema();
  },

  /**
   * Injecte les micro-données Schema.org (Google Rich Snippets) lorsqu'un film/série/animé est ouvert
   */
  updateMediaSchema(media) {
    if (!media) {
      this.removeMediaSchema();
      return;
    }

    const title = media.title || media.name || "Titre";
    const isTV = media.media_type === "tv" || Boolean(media.first_air_date) || media.source === "anime-sama" || media.source === "anilist";
    const year = (media.release_date || media.first_air_date || "").split("-")[0] || "";
    const posterUrl = media.poster_path 
      ? (media.poster_path.startsWith("http") ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
      : `${BASE_URL}/favicon.svg`;

    // Dynamic title & meta for selected media
    const yearLabel = year ? ` (${year})` : "";
    document.title = `${title}${yearLabel} en Streaming VF / VOSTFR HD Gratuit • Erodium`;
    
    const overview = media.overview || `Regardez ${title} en streaming français VF et VOSTFR haute définition sur Erodium. 100% gratuit et sans publicité.`;
    this.setMetaDescription(`Regarder ${title}${yearLabel} en streaming VF et VOSTFR complet et gratuit en HD 1080p sans pub sur Erodium. ${overview.slice(0, 140)}...`);

    // Schema.org Structured Data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": isTV ? "TVSeries" : "Movie",
      "name": title,
      "description": overview,
      "image": posterUrl,
      "url": `${BASE_URL}/?media=${media.id || ""}`,
      "inLanguage": "fr",
      "genre": media.genres?.map(g => g.name) || [],
      "aggregateRating": media.vote_average ? {
        "@type": "AggregateRating",
        "ratingValue": String(Math.round(media.vote_average * 10) / 10),
        "bestRating": "10",
        "worstRating": "1",
        "ratingCount": media.vote_count || 100
      } : undefined
    };

    if (year) {
      if (isTV) {
        schemaData.startDate = year;
      } else {
        schemaData.datePublished = year;
      }
    }

    let scriptTag = document.getElementById("erodium-media-schema");
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "erodium-media-schema";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaData);
  },

  /**
   * Nettoie les balises micro-données
   */
  removeMediaSchema() {
    const scriptTag = document.getElementById("erodium-media-schema");
    if (scriptTag) {
      scriptTag.remove();
    }
  },

  /**
   * Met à jour la meta description
   */
  setMetaDescription(desc) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  },

  /**
   * Ping IndexNow en tâche de fond pour indexation instantanée
   */
  pingIndexNow() {
    try {
      fetch("/api/indexnow").catch(() => {});
    } catch {}
  }
};
