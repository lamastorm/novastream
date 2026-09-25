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
    try {
      if (typeof searchQuery === "string" && searchQuery.trim()) {
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
    } catch (e) {
      console.warn("[seoService] Erreur updatePageMeta:", e);
    }
  },

  /**
   * Injecte les micro-données Schema.org (Google Rich Snippets) lorsqu'un film/série/animé est ouvert
   */
  updateMediaSchema(media) {
    try {
      if (!media) {
        this.removeMediaSchema();
        return;
      }

      const title = String(media.title || media.name || "Titre");
      const isTV = media.media_type === "tv" || Boolean(media.first_air_date) || media.source === "anime-sama" || media.source === "anilist";
      const rawDate = String(media.release_date || media.first_air_date || "");
      const year = rawDate ? rawDate.split("-")[0] : "";
      
      const posterPath = typeof media.poster_path === "string" ? media.poster_path : (typeof media.customPoster === "string" ? media.customPoster : "");
      const posterUrl = posterPath
        ? (posterPath.startsWith("http") ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`)
        : `${BASE_URL}/favicon.svg`;

      // Dynamic title & meta for selected media
      const yearLabel = year ? ` (${year})` : "";
      document.title = `${title}${yearLabel} en Streaming VF / VOSTFR HD Gratuit • Erodium`;
      
      const rawOverview = typeof media.overview === "string" ? media.overview : "";
      const overview = rawOverview || `Regardez ${title} en streaming français VF et VOSTFR haute définition sur Erodium. 100% gratuit et sans publicité.`;
      this.setMetaDescription(`Regarder ${title}${yearLabel} en streaming VF et VOSTFR complet et gratuit en HD 1080p sans pub sur Erodium. ${overview.slice(0, 140)}...`);

      // Safe genres array
      const genresList = Array.isArray(media.genres)
        ? media.genres.map(g => (typeof g === "object" && g ? g.name : String(g))).filter(Boolean)
        : [];

      // Safe rating
      const voteAvg = Number(media.vote_average);
      const ratingCount = Number(media.vote_count);

      // Schema.org Structured Data
      const schemaData = {
        "@context": "https://schema.org",
        "@type": isTV ? "TVSeries" : "Movie",
        "name": title,
        "description": overview,
        "image": posterUrl,
        "url": `${BASE_URL}/?media=${media.id || ""}`,
        "inLanguage": "fr",
        "genre": genresList,
        "aggregateRating": !isNaN(voteAvg) && voteAvg > 0 ? {
          "@type": "AggregateRating",
          "ratingValue": String(Math.round(voteAvg * 10) / 10),
          "bestRating": "10",
          "worstRating": "1",
          "ratingCount": !isNaN(ratingCount) && ratingCount > 0 ? ratingCount : 100
        } : undefined
      };

      if (year && !isNaN(Number(year))) {
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
    } catch (e) {
      console.warn("[seoService] Erreur updateMediaSchema:", e);
    }
  },

  /**
   * Nettoie les balises micro-données
   */
  removeMediaSchema() {
    try {
      const scriptTag = document.getElementById("erodium-media-schema");
      if (scriptTag) {
        scriptTag.remove();
      }
    } catch (e) {
      console.warn("[seoService] Erreur removeMediaSchema:", e);
    }
  },

  /**
   * Met à jour la meta description
   */
  setMetaDescription(desc) {
    try {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = desc;
    } catch (e) {
      console.warn("[seoService] Erreur setMetaDescription:", e);
    }
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
