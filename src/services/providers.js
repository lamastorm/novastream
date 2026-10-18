// Configuration des serveurs de streaming 100% vérifiés et actifs (1080p FHD & 4K)
// Note : Tous les domaines sont testés et validés sans blocage DNS FAI.

/**
 * Détecte les informations linguistiques et le pays d'origine du média
 */
export const getMediaLanguageInfo = (media) => {
  const origLang = (media?.original_language || "").toLowerCase();
  const title = (media?.title || media?.name || "").toLowerCase();
  
  const hasAnimationGenre =
    media?.genre_ids?.includes(16) ||
    media?.genres?.some((g) => g.id === 16 || (g.name || "").toLowerCase().includes("anim"));

  const isAnimeSource =
    media?.source === "anilist" ||
    media?.source === "mal" ||
    media?.source === "anime-sama" ||
    String(media?.id).startsWith("as_");

  const isKnownAnimeTitle =
    /sword art online|gun gale|naruto|one piece|jujutsu|shingeki|titan|dragon ball|bleach|hunter|demon slayer|kimetsu|hero academia|solo leveling|death note|tokyo ghoul|chainsaw|frieren|kaiju|oshi no ko|danmachi|blue lock|boruto|black clover|haikyu|jojo|evangelion|dr\. stone|spy x family|vinland|slime|classroom of the elite|bungo stray dogs|wind breaker|mushoku tensei|overlord|fate\/|re:zero|kaiju no\. 8|dandadan|dungeon meshi|gintama|steins;gate|fullmetal|code geass|fairy tail|wakfu|radiant/i.test(
      title
    );

  // Exclude western live-action remakes (e.g. Netflix One Piece 2023)
  const isLiveActionRemake = origLang === "en" && !hasAnimationGenre && !isAnimeSource;

  const isAnime =
    !isLiveActionRemake &&
    (isAnimeSource ||
      origLang === "ja" ||
      (hasAnimationGenre && (origLang === "ja" || origLang === "ko" || origLang === "zh" || isKnownAnimeTitle)) ||
      (isKnownAnimeTitle && (origLang === "ja" || hasAnimationGenre || !media?.release_date)));

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
  if (server?.isSkyStream || server?.id === "skystream_direct") {
    return {
      flag: "⚡ 🇫🇷",
      flagDisplay: "⚡ 🇫🇷",
      audio: "Multi-Audio VF 5.1 & VO",
      subs: "Sous-titres & Audio au choix",
      badge: "⚡ 1080p 0 Pub",
      subBadge: "1080p FHD Direct",
      description: "Flux Full HD 1080p direct avec audio français, sous-titres et zéro pub.",
    };
  }

  if (server?.isNativeStream || server?.id === "erodium_direct") {
    return {
      flag: "⚡ 🇫🇷",
      flagDisplay: "⚡ 🇫🇷",
      audio: "Multi-Audio VF 5.1 & VO 5.1 (Direct)",
      subs: "Sous-titres & Audio sélectionnables",
      badge: "⚡ Erodium Natif (0 Pub)",
      subBadge: "1080p FHD",
      description: "Lecteur Erodium officiel sans aucune publicité, sans redirection et en qualité 1080p native avec choix de la langue audio.",
    };
  }

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
  name: "Lecteur VidMoly",
  flag: "🇫🇷",
  badge: "🇫🇷 VidMoly (VF/VOSTFR)",
  description: "Lecteur officiel VidMoly rapide avec doublage français officiel et choix VF / VOSTFR.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://frembed.bar/embed/movie/${id}`;
    }
    return `https://frembed.bar/embed/serie/${id}?sa=${season}&epi=${episode}`;
  },
};

export const ANYEMBED_VF_SERVER = {
  id: "anyembed_vf",
  name: "Serveur 3 (AnyEmbed • Multi 1080p / 4K VF)",
  flag: "🌐",
  badge: "🌐 1080p/4K VF",
  description: "Lecteur HD rapide avec pistes audio multiples au choix sans redirection.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://anyembed.xyz/embed/tmdb-movie-${id}`;
    }
    return `https://anyembed.xyz/embed/tmdb-tv-${id}-${season}-${episode}`;
  },
};

export const VIDMOLY_MIRROR_VF_SERVER = ANYEMBED_VF_SERVER;

export const AUTOEMBED_VF_SERVER = {
  id: "autoembed_vf",
  name: "Serveur 1 (AutoEmbed • FHD 0 Pub Multi-FR)",
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
  // --- SERVEURS VF (DOUBLAGE FRANÇAIS) ---
  // ==========================================
  vf: [
    AUTOEMBED_VF_SERVER,
    VIDMOLY_VF_SERVER,
    ANYEMBED_VF_SERVER,
    VIDSRC_ME_VF_SERVER,
    VIDSRC_IN_VF_SERVER,
    TWOEMBED_VF_SERVER,
    PLAY123_VF_SERVER,
    SMASHY_VF_SERVER,
  ],
  vostfr: [
    AUTOEMBED_VF_SERVER,
    ANYEMBED_VF_SERVER,
    VIDMOLY_VF_SERVER,
    VIDSRC_ME_VF_SERVER,
  ],
  multi: [
    AUTOEMBED_VF_SERVER,
    ANYEMBED_VF_SERVER,
    VIDMOLY_VF_SERVER,
  ],
};

export const SKYSTREAM_SERVER = {
  id: "skystream_direct",
  name: "Serveur 1 (Lecteur Principal • 0 Pub FHD)",
  flag: "⚡ 🇫🇷",
  badge: "⚡ 1080p 0 Pub",
  isSkyStream: true,
  description: "Lecteur principal Full HD 1080p multilingue avec choix des pistes audio, sous-titres officiels et 0 publicité.",
  getUrl: (type, id, season = 1, episode = 1) => {
    if (type === "movie") {
      return `https://skystream.fun/film/${id}?play=1`;
    }
    return `https://skystream.fun/serie/${id}?play=1&season=${season}&episode=${episode}`;
  },
};

export const ERODIUM_DIRECT_MOVIE_SERVER = {
  id: "erodium_direct",
  name: "Serveur 2 (Lecteur Erodium Natif • 0 Pub FHD)",
  flag: "⚡",
  badge: "⚡ 0 Pub FHD",
  isNativeStream: true,
  description: "Lecteur Erodium 100% natif, zéro publicité, zéro popup et qualité Full HD 1080p directe (Multi-Audio VF 5.1 & VO).",
  getUrl: () => "",
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
 * Détecte si le code s'exécute dans l'application de bureau Electron ou sur le site web
 */
export const isDesktopApp = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.electronAPI?.isDesktop) || window.location.protocol === "file:";
};

/**
 * Retourne la liste des serveurs adaptés pour le site :
 * - #1 : SkyStream (1080p FHD direct, multilingue, 0 pub)
 * - #2 : Lecteur VidMoly (frembed.bar)
 * - Animés : Lecteur Erodium VF / VOSTFR en #1 + VidMoly
 */
export const getStreamingServersForMedia = (media, lang = "vf") => {
  const mediaInfo = getMediaLanguageInfo(media);

  // CAS 1 : ANIMÉS -> Lecteur Erodium (VF / VOSTFR) en #1 + VidMoly
  if (mediaInfo.isAnime) {
    if (lang === "vf") {
      return [ERODIUM_VF_SERVER, VIDMOLY_VF_SERVER];
    }
    if (lang === "vostfr") {
      return [ERODIUM_VOSTFR_SERVER, VIDMOLY_VF_SERVER];
    }
    return [ERODIUM_VF_SERVER, VIDMOLY_VF_SERVER];
  }

  // CAS 2 : FILMS & SÉRIES -> SkyStream 0 Pub en #1 + VidMoly en #2 + AutoEmbed en #3 + AnyEmbed en #4
  return [
    SKYSTREAM_SERVER,
    VIDMOLY_VF_SERVER,
    AUTOEMBED_VF_SERVER,
    ANYEMBED_VF_SERVER,
  ];
};


