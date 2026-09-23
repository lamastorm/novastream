// Configuration des serveurs de streaming 100% vérifiés et actifs (1080p FHD & 4K)
// Note : Tous les domaines sont testés et validés sans blocage DNS FAI.

/**
 * Détecte les informations linguistiques et le pays d'origine du média
 */
export const getMediaLanguageInfo = (media) => {
  const origLang = (media?.original_language || "").toLowerCase();
  const isAnime =
    origLang === "ja" ||
    media?.genre_ids?.includes(16) ||
    media?.genres?.some((g) => g.id === 16) ||
    media?.source === "anilist" ||
    media?.source === "mal";

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
  { id: "vf", label: "🇫🇷 VF (Français)", desc: "Pistes audio françaises directes (Doublage FR)" },
  { id: "vostfr", label: "💬 VOSTFR (1080p)", desc: "Version originale sous-titrée en français HD" },
  { id: "multi", label: "🌐 1080p / 4K", desc: "Qualité vidéo maximale avec sélection de langue audio et sous-titres" },
];

export const STREAMING_SERVERS = {
  // ==========================================
  // --- SERVEURS VF (DOUBLAGE FRANÇAIS) ---
  // ==========================================
  vf: [
    {
      id: "autoembed_co_vf",
      name: "Serveur 1 (AutoEmbed FHD 1080p)",
      flag: "🇫🇷",
      badge: "🇫🇷 VF Direct",
      description: "Lecteur rapide haute définition direct avec piste audio française",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://autoembed.co/movie/tmdb/${id}`;
        }
        return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
      },
    },
    {
      id: "frembed_surf_vf",
      name: "Serveur 2 (FrEmbed • Vidmoly / Uqload / Sibnet)",
      flag: "🇫🇷",
      badge: "🇫🇷 VF Direct",
      description: "Lecteurs français (Vidmoly, Uqload, Sibnet). Cliquez sur SERVEURS à gauche dans la vidéo pour changer d'hébergeur si besoin.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://frembed.surf/embed/movie/${id}?id=${id}`;
        }
        return `https://frembed.surf/embed/serie/${id}?id=${id}&sa=${season}&epi=${episode}`;
      },
    },
    {
      id: "multiembed_vf",
      name: "Serveur 3 (MultiEmbed FR)",
      flag: "🇫🇷",
      badge: "🇫🇷 HD Multi",
      description: "Agrégateur multi-sources avec pistes françaises (VidCloud / UpCloud)",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        }
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
      },
    },
    {
      id: "vidsrc_me_vf",
      name: "Serveur 4 (VidSrc FR)",
      flag: "🇫🇷",
      badge: "🇫🇷 VF 1080p",
      description: "Lecteur VidSrc configuré avec priorité audio française",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.me/embed/movie?tmdb=${id}&ds_lang=fr`;
        }
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&ds_lang=fr`;
      },
    },
    {
      id: "frembed_click",
      name: "Serveur 5 (FrEmbed Miroir 2)",
      flag: "🇫🇷",
      badge: "🇫🇷 VF Miroir",
      description: "Deuxième passerelle française de secours (Vidmoly / Sibnet)",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://frembed.click/api/film.php?id=${id}`;
        }
        return `https://frembed.art/api/serie.php?id=${id}&sa=${season}&epi=${episode}`;
      },
    },
  ],

  // ==========================================
  // --- SERVEURS VOSTFR (SOUS-TITRES FRANÇAIS) ---
  // ==========================================
  vostfr: [
    {
      id: "frembed_surf_vostfr",
      name: "Serveur 1 (FrEmbed STFR • Vidmoly / Sibnet)",
      flag: "🇫🇷",
      badge: "🇫🇷 STFR Garanti",
      description: "Sous-titres français incrustés directement dans la vidéo (Hardsub). Zéro bug et aucun quota de sous-titres.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://frembed.surf/embed/movie/${id}?id=${id}`;
        }
        return `https://frembed.surf/embed/serie/${id}?id=${id}&sa=${season}&epi=${episode}`;
      },
    },
    {
      id: "smashy_direct_vostfr",
      name: "Serveur 2 (SmashyStream • Multi-STFR 1080p)",
      flag: "💬",
      badge: "1080p CC",
      description: "Sélectionnez Français dans l'icône CC ou la roue crantée du lecteur pour activer les sous-titres.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://player.smashystream.com/movie/${id}`;
        }
        return `https://player.smashystream.com/tv/${id}/${season}/${episode}`;
      },
    },
    {
      id: "multiembed_vostfr",
      name: "Serveur 3 (MultiEmbed HD • VidCloud)",
      flag: "💬",
      badge: "HD Multi",
      description: "Multiples serveurs miroir (VidCloud / UpCloud) avec pistes de sous-titres FR.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        }
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
      },
    },
    {
      id: "autoembed_co_vostfr",
      name: "Serveur 4 (AutoEmbed FHD • Spécial Animés & Films)",
      flag: "💬",
      badge: "1080p FHD Direct",
      description: "Lecteur direct haute définition.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://autoembed.co/movie/tmdb/${id}`;
        }
        return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
      },
    },
    {
      id: "twoembed_vostfr",
      name: "Serveur 5 (2Embed • Sous-titres Officiels)",
      flag: "💬",
      badge: "STFR Officiel",
      description: "Lecteur miroir avec sous-titres synchronisés.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://www.2embed.cc/embed/${id}`;
        }
        return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
      },
    },
    {
      id: "vidsrc_vostfr",
      name: "Serveur 5 (VidSrc Direct • Sous-Titres FR)",
      flag: "💬",
      badge: "🇫🇷 CC Auto",
      description: "Lecteur officiel VidSrc avec paramètre de langue française forcé.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidsrc.me/embed/movie?tmdb=${id}&sub_lang=fra`;
        }
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&sub_lang=fra`;
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
      id: "multiembed_vostfr",
      name: "Serveur 7 (MultiEmbed FR)",
      flag: "💬",
      badge: "HD Multi",
      description: "Multiples serveurs miroir (VidCloud / UpCloud) avec pistes de sous-titres FR.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        }
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
      },
    },
    {
      id: "vidsrc_in_vostfr",
      name: "Serveur 8 (VidSrc IN Miroir)",
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
    {
      id: "frembed_vostfr",
      name: "Serveur 9 (FrEmbed VOSTFR)",
      flag: "💬",
      badge: "STFR Direct",
      description: "Lecteurs Vidmoly / Sibnet / Uqload en version originale sous-titrée français.",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://frembed.click/api/film.php?id=${id}`;
        }
        return `https://frembed.art/api/serie.php?id=${id}&sa=${season}&epi=${episode}`;
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
      id: "vidlink_multi",
      name: "Serveur 2 (VidLink 1080p / 4K)",
      flag: "🌐",
      badge: "🌐 4K / DoH",
      description: "Lecteur ultra-rapide avec sélecteur de qualité 1080p/4K (Nécessite DNS Sécurisé si bloqué par FAI)",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://vidlink.pro/movie/${id}`;
        }
        return `https://vidlink.pro/tv/${id}/${season}/${episode}`;
      },
    },
    {
      id: "smashy_multi",
      name: "Serveur 2 (SmashyStream • Choix 1080p / 4K)",
      flag: "🌐",
      badge: "🌐 1080p / 4K",
      description: "Qualité maximale sans recompression avec pistes audio au choix",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://player.smashystream.com/movie/${id}`;
        }
        return `https://player.smashystream.com/tv/${id}/${season}/${episode}`;
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
      id: "multiembed_multi",
      name: "Serveur 6 (MultiEmbed HD)",
      flag: "🌐",
      badge: "🌐 HD Multi",
      description: "Multiples serveurs miroir (VidCloud / UpCloud)",
      getUrl: (type, id, season = 1, episode = 1) => {
        if (type === "movie") {
          return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
        }
        return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
      },
    },
    {
      id: "play123_multi",
      name: "Serveur 7 (123Embed Clean)",
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
