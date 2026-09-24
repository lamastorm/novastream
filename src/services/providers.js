// Configuration des serveurs de streaming 100% vérifiés et actifs (1080p FHD & 4K)
// Note : Tous les domaines sont testés et validés sans blocage DNS FAI.

/**
 * Détecte les informations linguistiques et le pays d'origine du média
 */
export const getMediaLanguageInfo = (media) => {
  const origLang = (media?.original_language || "").toLowerCase();
  const title = (media?.title || media?.name || "").toLowerCase();
  
  // Détection stricte d'animé (Anime-Sama) : animation japonaise ou licences manga / anime
  const isAnime =
    media?.source === "anilist" ||
    media?.source === "mal" ||
    origLang === "ja" ||
    ((origLang === "ko" || origLang === "zh") &&
      (media?.genre_ids?.includes(16) || media?.genres?.some((g) => g.id === 16))) ||
    /sword art online|gun gale|naruto|one piece|jujutsu|shingeki|titan|dragon ball|bleach|hunter|demon slayer|kimetsu|hero academia|solo leveling|death note|tokyo ghoul|chainsaw|frieren|kaiju|oshi no ko|danmachi|blue lock|boruto|black clover|haikyu|jojo|evangelion|dr\. stone|spy x family|vinland|slime|classroom of the elite|bungo stray dogs|wind breaker|mushoku tensei|overlord|fate\/|re:zero|kaiju no\. 8|dandadan|dungeon meshi|gintama|steins;gate|fullmetal|code geass|fairy tail|wakfu|radiant/i.test(
      title
    );

  const map = {
    ja: { flag: "🇯🇵", audio: "Japonais", name: "Japon (Animé)", isAnime: true },
    en: { flag: "🇬🇧", audio: "Anglais", name: "Anglais (VO)", isAnime: false },
    fr: { flag: "🇫🇷", audio: "Français", name: "Français (VF)", isAnime: false },
    ko: { flag: "🇰🇷", audio: "Coréen", name: "Coréen (K-Drama)", isAnime: false },
    es: { flag: "🇪🇸", audio: "Espagnol", name: "Espagnol", isAnime: false },
    de: { flag: "🇩🇪", audio: "Allemand", name: "Allemand", isAnime: false },
    it: { flag: "🇮🇹", audio: "Italien", name: "Italien", isAnime: false },
    th: { flag: "🇹🇭", audio: "Thaïlandais", name: "Thaïlandais (Série Thaï)", isAnime: false },
    zh: { flag: "🇨🇳", audio: "Chinois", name: "Chinois (Drama)", isAnime: false },
    cn: { flag: "🇨🇳", audio: "Cantonais", name: "Cantonais", isAnime: false },
    hi: { flag: "🇮🇳", audio: "Hindi", name: "Hindi (Bollywood)", isAnime: false },
    tr: { flag: "🇹🇷", audio: "Turc", name: "Turc (Dizi)", isAnime: false },
  };

  const info = map[origLang] || { flag: "🌐", audio: "Version Originale", name: "VO", isAnime };
  return {
    ...info,
    origLang,
    isAnime: isAnime || info.isAnime,
  };
};

/**
 * Fournit les métadonnées détaillées pour chaque serveur en fonction du média actif
 */
export const getServerDetails = (server, media, selectedLanguage) => {
  const mediaInfo = getMediaLanguageInfo(media);

  if (server?.isAnimeSama) {
    if (selectedLanguage === "vf") {
      return {
        flag: "🇫🇷",
        flagDisplay: "🇫🇷",
        audio: "Vrai Doublage Français (VF Officielle)",
        subs: "Audio français direct (Sans sous-titres obligatoires)",
        badge: "🇫🇷 VF Erodium",
        subBadge: "VF Officielle",
        description: "Doublage français officiel via le Lecteur Erodium. Zéro coupure, hébergement haute vitesse.",
      };
    }
    return {
      flag: "🇯🇵 🇫🇷",
      flagDisplay: "🇯🇵 🇫🇷",
      audio: "Japonais (VO)",
      subs: "Sous-titres Français incrustés (Erodium)",
      badge: "🇯🇵 VOSTFR Erodium",
      subBadge: "VOSTFR Officiel",
      description: "Version originale avec sous-titres français intégrés par Erodium.",
    };
  }

  if (server?.id === "vidmoly_vf" || server?.id === "frembed_surf_vf") {
    return {
      flag: "🇫🇷",
      flagDisplay: "🇫🇷",
      audio: "Vrai Doublage Français (VidMoly VF)",
      subs: "Non requis",
      badge: "🇫🇷 VidMoly VF",
      subBadge: "VF Directe",
      description: "Lecteur VidMoly haute vitesse avec doublage français direct sans coupure.",
    };
  }

  if (server?.id === "frembed_click") {
    return {
      flag: "🇫🇷",
      flagDisplay: "🇫🇷",
      audio: "Audio Français (Miroir)",
      subs: "Non requis",
      badge: "🇫🇷 VF Miroir",
      subBadge: "VF Secours",
      description: "Deuxième passerelle française VidMoly / Sibnet de secours.",
    };
  }

  if (selectedLanguage === "vf") {
    return {
      flag: "🇫🇷",
      flagDisplay: "🇫🇷",
      audio: "Audio Français parlé (VF)",
      subs: "Non requis",
      badge: "🇫🇷 Audio FR Direct",
      subBadge: "VF Doublée",
      description: server.description || "Lecteur avec doublage audio français direct sans sous-titres obligatoires.",
    };
  }

  if (selectedLanguage === "vostfr") {
    const voFlag = mediaInfo.flag;
    const voAudio = mediaInfo.audio;
    return {
      flag: `${voFlag} 🇫🇷`,
      flagDisplay: `${voFlag} 🇫🇷`,
      audio: `Audio ${voAudio} (VO)`,
      subs: "Sous-titres Français (STFR)",
      badge: `${voFlag} Audio • 🇫🇷 STFR`,
      subBadge: mediaInfo.isAnime ? "🇯🇵 Animé VOSTFR" : "VOSTFR 1080p",
      description: server.description || `Audio original ${voAudio} avec sous-titres français officiels intégrés.`,
    };
  }

  // Multi
  return {
    flag: "🌐",
    flagDisplay: "🌐",
    audio: "Multi-Audio (Choix dans le lecteur)",
    subs: "Multi-Sous-titres (CC)",
    badge: "🌐 Multi 1080p / 4K",
    subBadge: "Multi-Langues",
    description: server.description || "Lecteur haute définition avec choix libre de la piste audio et des sous-titres.",
  };
};

export const LANGUAGE_OPTIONS = [
  { id: "vf", label: "▶ VISIONNER EN VF 🇫🇷", desc: "Pistes audio françaises directes (Doublage FR)" },
  { id: "vostfr", label: "▶ VISIONNER EN VOSTFR 🇯🇵", desc: "Version originale sous-titrée en français HD" },
  { id: "multi", label: "▶ VISIONNER EN MULTI 🌐", desc: "Qualité vidéo maximale avec sélection de langue audio et sous-titres" },
];

export const VIDMOLY_VF_SERVER = {
  id: "vidmoly_vf",
  name: "Serveur 1 (VidMoly • VF Directe)",
  flag: "🇫🇷",
  badge: "🇫🇷 VidMoly VF",
  description: "Lecteur VidMoly direct avec doublage français officiel sans coupure.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://frembed.surf/api/film.php?id=${id}`;
    }
    return `https://frembed.surf/api/serie.php?id=${id}&sa=${season}&epi=${episode}`;
  },
};

export const VIDMOLY_MIRROR_VF_SERVER = {
  id: "frembed_click",
  name: "Serveur 2 (VidMoly Miroir • VF)",
  flag: "🇫🇷",
  badge: "🇫🇷 VF Miroir",
  description: "Deuxième passerelle française VidMoly / Sibnet / Uqload de secours.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://frembed.click/api/film.php?id=${id}`;
    }
    return `https://frembed.art/api/serie.php?id=${id}&sa=${season}&epi=${episode}`;
  },
};

export const AUTOEMBED_VF_SERVER = {
  id: "autoembed_vf",
  name: "Serveur 2 (AutoEmbed • FHD 0 Pub Multi-FR)",
  flag: "⚡",
  badge: "⚡ 0 Pub Multi-FR",
  description: "Lecteur moderne haute vitesse sans pub (style Domgrav), avec piste audio française.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://autoembed.co/movie/tmdb/${id}`;
    }
    return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
  },
};

export const ANYEMBED_VF_SERVER = {
  id: "anyembed_vf",
  name: "Serveur 3 (AnyEmbed • Multi 1080p / 4K)",
  flag: "🌐",
  badge: "🌐 1080p/4K",
  description: "Lecteur HD rapide avec pistes audio multiples au choix sans coupure.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://anyembed.xyz/embed/tmdb-movie-${id}`;
    }
    return `https://anyembed.xyz/embed/tmdb-tv-${id}-${season}-${episode}`;
  },
};

export const VIDSRC_ME_VF_SERVER = {
  id: "vidsrc_me_vf",
  name: "Serveur 5 (VidSrc FR • 1080p VF)",
  flag: "🇫🇷",
  badge: "🇫🇷 VidSrc VF",
  description: "Lecteur VidSrc éprouvé configuré avec doublage français.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://vidsrc.me/embed/movie?tmdb=${id}&ds_lang=fr`;
    }
    return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&ds_lang=fr`;
  },
};

export const VIDSRC_IN_VF_SERVER = {
  id: "vidsrc_in_vf",
  name: "Serveur 6 (VidSrc IN • STFR / VF)",
  flag: "💬",
  badge: "💬 FHD FR",
  description: "Miroir rapide avec paramètres de langue française intégrés.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://vidsrc.in/embed/movie?tmdb=${id}&sub_lang=fra`;
    }
    return `https://vidsrc.in/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&sub_lang=fra`;
  },
};

export const TWOEMBED_VF_SERVER = {
  id: "twoembed_vf",
  name: "Serveur 7 (2Embed 1080p)",
  flag: "🌐",
  badge: "🌐 1080p",
  description: "Lecteur haute définition rapide.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://www.2embed.cc/embed/${id}`;
    }
    return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
  },
};

export const PLAY123_VF_SERVER = {
  id: "play123_vf",
  name: "Serveur 8 (123Embed Clean)",
  flag: "🛡️",
  badge: "🛡️ Clean",
  description: "Miroir alternatif 1080p sans surcharge.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://play2.123embed.net/movie/${id}`;
    }
    return `https://play2.123embed.net/tv/${id}/${season}/${episode}`;
  },
};

export const SMASHY_VF_SERVER = {
  id: "smashy_vf",
  name: "Serveur 9 (SmashyStream Multi)",
  flag: "🌐",
  badge: "🌐 Multi",
  description: "Agrégateur multi-sources alternatif.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://embed.smashystream.com/playere.php?tmdb=${id}`;
    }
    return `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${season}&episode=${episode}`;
  },
};

export const STREAMING_SERVERS = {
  // ==========================================
  // --- SERVEURS VF (100% DOUBLAGE FRANÇAIS) ---
  // ==========================================
  vf: [
    VIDMOLY_VF_SERVER,
    AUTOEMBED_VF_SERVER,
    ANYEMBED_VF_SERVER,
    VIDMOLY_MIRROR_VF_SERVER,
    VIDSRC_ME_VF_SERVER,
    VIDSRC_IN_VF_SERVER,
    TWOEMBED_VF_SERVER,
    PLAY123_VF_SERVER,
    SMASHY_VF_SERVER,
  ],

  // ==========================================
  // --- SERVEURS VOSTFR (SOUS-TITRES FRANÇAIS) ---
  // ==========================================
  vostfr: [
    {
      id: "autoembed_co_vostfr",
      name: "Serveur 1 (AutoEmbed FHD • ⚡ Sans Pub)",
      flag: "⚡",
      badge: "⚡ 0 Pub FHD",
      description: "Lecteur moderne sans pub (style Domgrav), ultra fluide et rapide.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://autoembed.co/movie/tmdb/${id}`;
        }
        return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
      },
    },
    {
      id: "anyembed_direct_vostfr",
      name: "Serveur 2 (AnyEmbed FHD • Multi-STFR)",
      flag: "💬",
      badge: "1080p CC",
      description: "Lecteur moderne sans coupure. Cliquez sur CC pour sélectionner les sous-titres.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://anyembed.xyz/embed/tmdb-movie-${id}`;
        }
        return `https://anyembed.xyz/embed/tmdb-tv-${id}-${season}-${episode}`;
      },
    },
    {
      id: "vidsrc_to_vostfr",
      name: "Serveur 3 (VidSrc TO • STFR HD)",
      flag: "💬",
      badge: "FHD Direct",
      description: "Lecteur éprouvé avec sous-titres intégrés.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.to/embed/movie/${id}`;
        }
        return `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
      },
    },
    {
      id: "frembed_surf_vostfr",
      name: "Serveur 4 (VidMoly STFR • VF/VOSTFR)",
      flag: "🇫🇷",
      badge: "🇫🇷 STFR",
      description: "Sous-titres français incrustés directement dans la vidéo.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://frembed.surf/api/film.php?id=${id}`;
        }
        return `https://frembed.surf/api/serie.php?id=${id}&sa=${season}&epi=${episode}`;
      },
    },
    {
      id: "vidsrc_pm_vostfr",
      name: "Serveur 5 (VidSrc PM Miroir)",
      flag: "💬",
      badge: "⚡ Miroir",
      description: "Miroir direct alternatif haute vitesse.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.pm/embed/movie/${id}?sub_lang=fra`;
        }
        return `https://vidsrc.pm/embed/tv/${id}/${season}/${episode}?sub_lang=fra`;
      },
    },
    {
      id: "vidsrc_cc_vostfr",
      name: "Serveur 6 (VidSrc CC v2)",
      flag: "💬",
      badge: "FHD STFR",
      description: "Deuxième passerelle VidSrc v2 avec vaste couverture des animés.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.cc/v2/embed/movie/${id}`;
        }
        return `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`;
      },
    },
    {
      id: "vidsrc_in_vostfr",
      name: "Serveur 7 (VidSrc IN Miroir)",
      flag: "💬",
      badge: "1080p CC",
      description: "Miroir rapide avec paramètre de sous-titres français automatique.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.in/embed/movie?tmdb=${id}&sub_lang=fra`;
        }
        return `https://vidsrc.in/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&sub_lang=fra`;
      },
    },
  ],

  // ==========================================
  // --- SERVEURS 1080P / MULTI-LANGUES ---
  // ==========================================
  multi: [
    {
      id: "autoembed_multi",
      name: "Serveur 1 (AutoEmbed Fast 1080p)",
      flag: "🌐",
      badge: "🌐 1080p Direct",
      description: "Flux fluide haute résolution sans mise en mémoire tampon",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://autoembed.co/movie/tmdb/${id}`;
        }
        return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
      },
    },
    {
      id: "anyembed_multi",
      name: "Serveur 2 (AnyEmbed • Choix 1080p / 4K)",
      flag: "🌐",
      badge: "🌐 1080p / 4K",
      description: "Qualité maximale sans recompression avec pistes audio au choix",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://anyembed.xyz/embed/tmdb-movie-${id}`;
        }
        return `https://anyembed.xyz/embed/tmdb-tv-${id}-${season}-${episode}`;
      },
    },
    {
      id: "vidsrc_pm_multi",
      name: "Serveur 3 (VidSrc PM 1080p)",
      flag: "🌐",
      badge: "🌐 1080p",
      description: "Miroir direct 1080p haute vitesse",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.pm/embed/movie/${id}`;
        }
        return `https://vidsrc.pm/embed/tv/${id}/${season}/${episode}`;
      },
    },
    {
      id: "vidsrc_multi",
      name: "Serveur 4 (VidSrc FHD Multi)",
      flag: "🌐",
      badge: "🌐 FHD",
      description: "Lecteur vidéo éprouvé avec choix de langues et sous-titres",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.me/embed/movie?tmdb=${id}`;
        }
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
      },
    },
    {
      id: "twoembed_multi",
      name: "Serveur 5 (2Embed 1080p)",
      flag: "🌐",
      badge: "🌐 1080p",
      description: "Lecteur haute définition rapide",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://www.2embed.cc/embed/${id}`;
        }
        return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
      },
    },
    {
      id: "play123_multi",
      name: "Serveur 6 (123Embed Clean)",
      flag: "🌐",
      badge: "🌐 1080p",
      description: "Miroir alternatif 1080p",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://play2.123embed.net/movie/${id}`;
        }
        return `https://play2.123embed.net/tv/${id}/${season}/${episode}`;
      },
    },
  ],
};

export const ERODIUM_VF_SERVER = {
  id: "erodium_vf",
  name: "Serveur 1 (Lecteur Erodium • VF 100% Officielle)",
  flag: "🇫🇷",
  badge: "🇫🇷 VF Erodium",
  isAnimeSama: true,
  description: "Vrai doublage français officiel hébergé sur les serveurs rapides Erodium sans coupure ni pub.",
  getUrl: () => "",
};

export const ERODIUM_VOSTFR_SERVER = {
  id: "erodium_vostfr",
  name: "Serveur 1 (Lecteur Erodium • VOSTFR HD)",
  flag: "🇯🇵 🇫🇷",
  badge: "🇯🇵 VOSTFR Erodium",
  isAnimeSama: true,
  description: "Version originale avec sous-titres français officiels intégrés par Erodium.",
  getUrl: () => "",
};

// Alias pour compatibilité
export const ANIME_SAMA_VF_SERVER = ERODIUM_VF_SERVER;
export const ANIME_SAMA_VOSTFR_SERVER = ERODIUM_VOSTFR_SERVER;

/**
 * Retourne la liste optimisée des serveurs pour le média spécifié :
 * - Pour les animés : place le Lecteur Erodium en #1 (Anime-Sama VF / VOSTFR), puis VidMoly
 * - Pour les films et séries classiques : place VidMoly en #1 (base) et N'AFFICHE PAS Erodium !
 */
export const getStreamingServersForMedia = (media, lang = "vf") => {
  const mediaInfo = getMediaLanguageInfo(media);
  const baseServers = STREAMING_SERVERS[lang] || STREAMING_SERVERS.vf;

  // CAS 1 : C'EST UN ANIMÉ -> Erodium en Lecteur #1 !
  if (mediaInfo.isAnime) {
    if (lang === "vf") {
      return [
        ERODIUM_VF_SERVER,
        ...baseServers.filter((s) => s.id !== "erodium_vf"),
      ];
    }
    if (lang === "vostfr") {
      return [
        ERODIUM_VOSTFR_SERVER,
        ...baseServers.filter((s) => s.id !== "erodium_vostfr"),
      ];
    }
    return baseServers;
  }

  // CAS 2 : FILMS ET SÉRIES CLASSIQUES (NON-ANIMÉ)
  // - VidMoly est le lecteur de base #1 (VIDMOLY_VF_SERVER)
  // - Erodium N'EST PAS affiché pour les films classiques
  // - TOUS les serveurs miroirs et propres restent disponibles sans exception !
  if (lang === "vf") {
    return baseServers.filter((s) => !s.isAnimeSama && s.id !== "erodium_vf");
  }

  if (lang === "vostfr") {
    return baseServers.filter((s) => !s.isAnimeSama && s.id !== "erodium_vostfr");
  }

  return baseServers.filter((s) => !s.isAnimeSama);
};

