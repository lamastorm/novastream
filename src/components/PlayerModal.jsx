import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Server,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Globe,
  Minimize2,
  Maximize2,
  ExternalLink,
  Languages,
  AlertCircle,
  Sparkles,
  Loader2,
  Play,
  Key,
  Volume2,
  VolumeX,
  Filter,
  Copy,
  List,
  Search,
  Check,
  Tv,
  ShieldCheck,
} from "lucide-react";
import {
  STREAMING_SERVERS,
  LANGUAGE_OPTIONS,
  getMediaLanguageInfo,
  getServerDetails,
  getStreamingServersForMedia,
} from "../services/providers";
import { storage } from "../services/storage";
import { tmdbApi } from "../api/tmdb";
import { hlsExtractor } from "../services/hlsExtractor";
import { languageAdvisor } from "../services/languageAdvisor";
import { animeProvider } from "../services/animeProvider";
import { useMediaLiveViewers, liveCounter } from "../services/liveCounter";
import HlsPlayer from "./HlsPlayer";
import EnhancerPanel from "./EnhancerPanel";
import DnsHelpModal from "./DnsHelpModal";
import { gamepadService } from "../services/gamepadService";

export default function PlayerModal({
  media,
  initialSeason = 1,
  initialEpisode = 1,
  initialLanguage = "vf",
  onClose,
}) {
  const needsVOSTFR = languageAdvisor.hasNoOfficialVF(media);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (needsVOSTFR) return "vostfr";
    return (
      initialLanguage ||
      localStorage.getItem("erodium_default_lang") ||
      localStorage.getItem("novastream_default_lang") ||
      "vf"
    );
  });
  const [autoSwitchedNotice, setAutoSwitchedNotice] = useState(
    needsVOSTFR && initialLanguage === "vf"
  );

  const [playerMode, setPlayerMode] = useState("embed");
  const [directStreamUrl, setDirectStreamUrl] = useState(null);
  const [isHlsLoading, setIsHlsLoading] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [hlsStatus, setHlsStatus] = useState(null);
  const [availableDebridStreams, setAvailableDebridStreams] = useState([]);
  const [selectedDebridIndex, setSelectedDebridIndex] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("all"); // "vf" | "vostfr" | "aac" | "rd_plus" | "4k" | "1080p" | "all"
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAllSourcesModal, setShowAllSourcesModal] = useState(false);
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");
  const [showSubtitleTip, setShowSubtitleTip] = useState(false);
  const [showDnsModal, setShowDnsModal] = useState(false);
  const sourcesScrollRef = useRef(null);
  // Enhancer: CSS filter string for video/iframe + ref to HLS video element
  const [videoFilter, setVideoFilter] = useState("");
  const hlsVideoRef = useRef(null);

  const scrollSources = (dir) => {
    if (sourcesScrollRef.current) {
      sourcesScrollRef.current.scrollBy({ left: dir * 350, behavior: "smooth" });
    }
  };

  // Auto-resolve media if external source (AniList, MAL, TVmaze)
  const [currentMedia, setCurrentMedia] = useState(media);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (media.source === "anilist" || media.source === "mal" || media.source === "tvmaze") {
      setIsResolving(true);
      const titleToSearch = media.title || media.name;
      tmdbApi
        .searchMulti(titleToSearch)
        .then((searchRes) => {
          const match =
            searchRes.results?.find(
              (r) =>
                (r.media_type === "tv" || r.media_type === "movie") &&
                (r.poster_path || r.backdrop_path)
            ) || searchRes.results?.[0];

          if (match) {
            const updated = {
              ...media,
              id: match.id,
              media_type: match.media_type || (media.title ? "movie" : "tv"),
              title: match.title || match.name || media.title,
              original_language: match.original_language || media.original_language,
            };
            setCurrentMedia(updated);
            if (languageAdvisor.hasNoOfficialVF(updated) && selectedLanguage === "vf") {
              setSelectedLanguage("vostfr");
              setAutoSwitchedNotice(true);
            }
          }
          setIsResolving(false);
        })
        .catch(() => setIsResolving(false));
    } else {
      setCurrentMedia(media);
      if (languageAdvisor.hasNoOfficialVF(media) && selectedLanguage === "vf") {
        setSelectedLanguage("vostfr");
        setAutoSwitchedNotice(true);
      }
    }
  }, [media]);
  
  // Available servers for current media & language (Anime-Sama in #1 for animes)
  const availableServers = getStreamingServersForMedia(currentMedia, selectedLanguage);

  const [selectedServer, setSelectedServer] = useState(() => {
    const servers = getStreamingServersForMedia(
      currentMedia,
      needsVOSTFR ? "vostfr" : initialLanguage || "vf"
    );
    return servers[0];
  });
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [iframeKey, setIframeKey] = useState(0);

  // État spécifique pour la passerelle officielle Anime-Sama
  const [animeData, setAnimeData] = useState(null);
  const [animeStreamUrl, setAnimeStreamUrl] = useState(null);
  const [isAnimeLoading, setIsAnimeLoading] = useState(false);
  const [animeError, setAnimeError] = useState(null);

  // Mini-player mode (Picture-in-Picture)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  const mediaType = currentMedia.media_type || (currentMedia.title ? "movie" : "tv");
  const isTV = mediaType === "tv";
  const title = currentMedia.title || currentMedia.name || "Lecture en cours";
  const liveViewersCount = useMediaLiveViewers(currentMedia.id, currentMedia.popularity);

  // Season & Episode Drawer State
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [drawerSeason, setDrawerSeason] = useState(initialSeason);
  const [drawerEpisodes, setDrawerEpisodes] = useState([]);
  const [isLoadingDrawerEpisodes, setIsLoadingDrawerEpisodes] = useState(false);

  // Fetch TV Details for seasons
  useEffect(() => {
    if (!isTV || !currentMedia?.id) return;
    let isMounted = true;
    tmdbApi
      .getDetails("tv", currentMedia.id)
      .then((data) => {
        if (isMounted && data) {
          setSeriesDetails(data);
          if (data.seasons && data.seasons.length > 0) {
            const hasCurrent = data.seasons.some((s) => s.season_number === season);
            if (!hasCurrent) {
              const firstSeason =
                data.seasons.find((s) => s.season_number > 0) || data.seasons[0];
              setDrawerSeason(firstSeason.season_number);
            } else {
              setDrawerSeason(season);
            }
          }
        }
      })
      .catch((err) => console.error("Error fetching tv details in player:", err));
    return () => {
      isMounted = false;
    };
  }, [currentMedia?.id, isTV]);

  // Fetch Season episodes when drawerSeason changes
  useEffect(() => {
    if (!isTV || !currentMedia?.id || drawerSeason === undefined || drawerSeason === null) return;
    let isMounted = true;
    setIsLoadingDrawerEpisodes(true);
    tmdbApi
      .getSeasonEpisodes(currentMedia.id, drawerSeason)
      .then((data) => {
        if (isMounted) {
          setDrawerEpisodes(data.episodes || []);
          setIsLoadingDrawerEpisodes(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching season episodes in player drawer:", err);
        if (isMounted) setIsLoadingDrawerEpisodes(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentMedia?.id, drawerSeason, isTV]);

  // Détection des web séries / dramas asiatiques (ex: The Loyal Pin, IdolFactory, GMMTV)
  const isWebDrama =
    isTV &&
    (seriesDetails?.networks?.some((n) =>
      /youtube|workpoint|gmm|idolfactory|wetv|iqiyi|viki/i.test(n.name)
    ) ||
      currentMedia.original_language === "th" ||
      /the loyal pin|gap the series|bad buddy|tharn|kinnporsche|secret crush/i.test(title));

  const handleLaunchYouTubeOfficial = () => {
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        title + " EP." + episode + " uncut"
      )}`,
      "_blank"
    );
  };

  // When language changes, reset server to first server of that language
  const handleLanguageChange = (langId) => {
    setSelectedLanguage(langId);
    localStorage.setItem("erodium_default_lang", langId);
    localStorage.setItem("novastream_default_lang", langId);
    const newServers = getStreamingServersForMedia(currentMedia, langId);
    setSelectedServer(newServers[0]);
    setIframeKey((k) => k + 1);
  };

  // Next Server helper (cycles through available servers for current language)
  const handleNextServer = () => {
    const servers = getStreamingServersForMedia(currentMedia, selectedLanguage);
    const currentIndex = servers.findIndex((s) => s.id === (selectedServer?.id || servers[0].id));
    const nextIndex = (currentIndex + 1) % servers.length;
    setSelectedServer(servers[nextIndex]);
    setIframeKey((k) => k + 1);
  };

  // Keep server in sync when language or server list changes
  useEffect(() => {
    const servers = getStreamingServersForMedia(currentMedia, selectedLanguage);
    const mediaInfo = getMediaLanguageInfo(currentMedia);

    // If it's an anime, automatically default to Lecteur Erodium (Server 1)
    if (mediaInfo.isAnime && servers[0]?.isAnimeSama && !selectedServer?.isAnimeSama) {
      setSelectedServer(servers[0]);
      return;
    }

    // If it's a classic film / series, ensure Erodium is NEVER active (switch to VidMoly #1)
    if (!mediaInfo.isAnime && selectedServer?.isAnimeSama) {
      setSelectedServer(servers[0]);
      return;
    }

    if (!servers.some((s) => s.id === selectedServer?.id)) {
      setSelectedServer(servers[0]);
    }
  }, [currentMedia, selectedLanguage, selectedServer]);

  // Résolution automatique du flux pour le serveur officiel Anime-Sama
  useEffect(() => {
    if (!selectedServer?.isAnimeSama) return;
    let isMounted = true;
    setIsAnimeLoading(true);
    setAnimeError(null);

    const mediaTitle = currentMedia.title || currentMedia.name || "";
    animeProvider
      .getEpisodeStream({
        title: mediaTitle,
        season,
        episode,
        lang: selectedLanguage === "vostfr" ? "vostfr" : "vf",
      })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && res.streamUrl) {
          setAnimeData(res);
          setAnimeStreamUrl(res.streamUrl);
        } else {
          setAnimeData(null);
          setAnimeStreamUrl(null);
          setAnimeError(res?.error || "Épisode non disponible sur Anime-Sama pour le moment.");
        }
        setIsAnimeLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setAnimeData(null);
        setAnimeStreamUrl(null);
        setAnimeError(err.message || "Erreur de connexion à Anime-Sama");
        setIsAnimeLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedServer?.id,
    selectedServer?.isAnimeSama,
    currentMedia.id,
    currentMedia.title,
    currentMedia.name,
    season,
    episode,
    selectedLanguage,
  ]);

  // Register in History
  useEffect(() => {
    storage.addToHistory(currentMedia, season, episode);
  }, [currentMedia, season, episode]);

  // Synchroniser le média en cours de visionnage avec le réseau temps réel
  useEffect(() => {
    if (currentMedia?.id) {
      liveCounter.setWatchingMedia(currentMedia.id);
    }
    return () => {
      liveCounter.setWatchingMedia(null);
    };
  }, [currentMedia?.id]);

  // When switching to HLS mode or changing episode, attempt to resolve direct stream
  useEffect(() => {
    if (playerMode === "hls" && !isDemoActive) {
      setIsHlsLoading(true);
      setHlsStatus(null);
      hlsExtractor
        .resolveDirectStream(currentMedia, season, episode)
        .then((res) => {
          if (res?.success && res.url) {
            setDirectStreamUrl(res.url);
            setHlsStatus(res);
            const streams = res.streams || [];
            setAvailableDebridStreams(streams);
            setSelectedDebridIndex(0);
            if (streams.some((s) => s.isFrench && !s.isAudioDescription && !s.isVF2)) {
              setSourceFilter("vf");
            } else if (streams.some((s) => s.isVostfr)) {
              setSourceFilter("vostfr");
            } else if (streams.some((s) => s.isCached)) {
              setSourceFilter("rd_plus");
            } else {
              setSourceFilter("all");
            }
          } else {
            setDirectStreamUrl(null);
            setAvailableDebridStreams([]);
            setHlsStatus(res || { success: false, reason: "unknown" });
          }
          setIsHlsLoading(false);
        })
        .catch((e) => {
          setDirectStreamUrl(null);
          setHlsStatus({ success: false, reason: "network_error", message: e.message });
          setIsHlsLoading(false);
        });
    }
  }, [playerMode, currentMedia, season, episode, isDemoActive]);

  const activeServer = selectedServer || availableServers[0];
  const currentEmbedUrl = activeServer?.isAnimeSama
    ? animeStreamUrl || ""
    : activeServer
    ? activeServer.getUrl(mediaType, currentMedia.id, season, episode, title)
    : "";

  const handleNextEpisode = () => {
    setEpisode((prev) => prev + 1);
    setDirectStreamUrl(null);
    setIframeKey((prev) => prev + 1);
  };

  const handlePrevEpisode = () => {
    if (episode > 1) {
      setEpisode((prev) => prev - 1);
      setDirectStreamUrl(null);
      setIframeKey((prev) => prev + 1);
    }
  };

  const handleSelectEpisode = (targetSeason, targetEpisode) => {
    setSeason(targetSeason);
    setEpisode(targetEpisode);
    setDirectStreamUrl(null);
    setIframeKey((prev) => prev + 1);
    setShowEpisodeDrawer(false);
  };

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const elem = containerRef.current || document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    // When PlayerModal opens, wire Gamepad B button to close modal
    const prevBack = gamepadService.callbacks.onBack;
    gamepadService.setCallbacks({ onBack: onClose });

    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.key === "f" || e.key === "F") && document.activeElement?.tagName !== "INPUT") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      gamepadService.setCallbacks({ onBack: prevBack });
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  // Render Mini-Player Floating Window
  if (isMiniPlayer) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-orange-500/50 shadow-orange-500/20 flex flex-col animate-fade-in group">
        {/* Floating Mini Controls Header */}
        <div className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-black/90 to-transparent z-30 px-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[11px] font-bold text-white truncate max-w-[170px]">
            {title} {isTV && `(S${season} E${episode})`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMiniPlayer(false)}
              className="p-1 rounded-md bg-black/60 hover:bg-black text-white cursor-pointer"
              title="Agrandir en plein écran"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <iframe
          key={`mini-${selectedServer.id}-${currentMedia.id}-${season}-${episode}-${iframeKey}`}
          src={currentEmbedUrl}
          title={title}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  // Regular Fullscreen / Cinema Mode
  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in">
      {/* Top Header Bar */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 glass z-20 relative">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 transition-colors cursor-pointer"
            title="Quitter le lecteur"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {isTV && (
                <span className="text-xs text-orange-400 font-semibold">
                  Saison {season} • Épisode {episode}
                </span>
              )}
              {isTV && <span className="text-zinc-600 text-xs hidden sm:inline">•</span>}
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{liveViewersCount} {liveViewersCount > 1 ? "spectateurs" : "spectateur"} en direct</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Controls: Language Selector + Episode switchers */}
        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown / Pills */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 rounded-xl p-1 shadow-inner">
            {LANGUAGE_OPTIONS.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              const mediaOrigin = getMediaLanguageInfo(currentMedia);
              let displayLabel = lang.label;
              if (lang.id === "vostfr") {
                displayLabel = `${mediaOrigin.flag || "🇯🇵"}/🇫🇷 VOSTFR${mediaOrigin.isAnime ? " (Animé)" : ""}`;
              } else if (lang.id === "vf") {
                displayLabel = "🇫🇷 VF (Français)";
              } else if (lang.id === "multi") {
                displayLabel = "🌐 Multi 1080p/4K";
              }
              return (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 border border-orange-400/50 scale-[1.02]"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                  title={lang.desc}
                >
                  <span>{displayLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Episode switchers (if TV/Anime) with Season & Episode Drawer Button */}
          {isTV && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-sm">
              <button
                onClick={handlePrevEpisode}
                disabled={episode <= 1}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Épisode précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  setDrawerSeason(season);
                  setShowEpisodeDrawer(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/40 text-orange-200 hover:text-white text-xs font-bold transition-all border border-orange-500/40 hover:scale-105 cursor-pointer shadow-sm"
                title="Changer de saison ou choisir un épisode dans la liste"
              >
                <List className="w-3.5 h-3.5 text-orange-400" />
                <span>S{season} : EP {episode}</span>
                <span className="text-[10px] text-zinc-400">▾</span>
              </button>

              <button
                onClick={handleNextEpisode}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Épisode suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sous-titres FR Auto Button */}
          <div className="relative">
            <button
              onClick={() => {
                if (selectedLanguage !== "vostfr") {
                  handleLanguageChange("vostfr");
                }
                setShowSubtitleTip((v) => !v);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedLanguage === "vostfr"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-400 shadow-md shadow-orange-600/25"
                  : "bg-zinc-900 text-zinc-300 hover:text-white border-white/5"
              }`}
              title="Activer les sous-titres français (VOSTFR)"
            >
              <Languages className="w-3.5 h-3.5 text-orange-300" />
              <span className="hidden sm:inline">Sous-titres FR</span>
            </button>

            {/* Subtitle helper popup */}
            {showSubtitleTip && (
              <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-zinc-900 border border-orange-500/40 rounded-xl shadow-2xl z-50 text-xs text-zinc-300 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5 text-orange-400">
                    <Sparkles className="w-4 h-4" />
                    Sous-titres Français (STFR)
                  </span>
                  <button
                    onClick={() => setShowSubtitleTip(false)}
                    className="text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  Les serveurs chargent automatiquement les pistes françaises.
                </p>
                <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-[11px] space-y-1">
                  <p className="font-semibold text-orange-300">💡 Pas de sous-titres affichés ?</p>
                  <p className="text-zinc-400">
                    Cliquez sur le bouton <strong>CC</strong> ou sur la <strong>roue crantée ⚙️</strong> en bas à droite de la vidéo et cochez <strong>« French / Français »</strong>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleLanguageChange("vostfr");
                    setShowSubtitleTip(false);
                  }}
                  className="w-full py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Basculer sur VOSTFR
                </button>
              </div>
            )}
          </div>

          {/* Mini-Player PiP button */}
          <EnhancerPanel
            videoRef={hlsVideoRef}
            isHlsMode={playerMode === "hls" && !!directStreamUrl}
            onFilterChange={setVideoFilter}
          />

          {/* Débloquer DNS FAI (Guide DoH Cloudflare / Google) */}
          <button
            onClick={() => setShowDnsModal(true)}
            className="px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/25 text-orange-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Contourner le blocage FAI (activer le DNS Sécurisé Cloudflare en 15s)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">Débloquer DNS FAI</span>
          </button>

          <button
            onClick={() => setIsMiniPlayer(true)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors hidden sm:flex items-center gap-1 text-xs"
            title="Réduire en mini-lecteur flottant (naviguer sur le site)"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden lg:inline">Mini-Lecteur</span>
          </button>

          {/* Reload Iframe button */}
          <button
            onClick={handleReload}
            data-focusable="true"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500"
            title="Recharger le lecteur"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Toggle Fullscreen button (Mobile, TV, Xbox, PC) */}
          <button
            onClick={toggleFullscreen}
            data-focusable="true"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 flex items-center gap-1.5"
            title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F / Touche Y manette)"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-orange-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            <span className="hidden lg:inline text-xs font-semibold">{isFullscreen ? "Normal" : "Plein écran"}</span>
          </button>

          {/* Open in external tab button */}
          <a
            href={currentEmbedUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-focusable="true"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors hidden sm:flex items-center gap-1.5 text-xs focus-visible:ring-2 focus-visible:ring-orange-500"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Plein écran externe</span>
          </a>

          {/* Close button */}
          <button
            onClick={onClose}
            data-focusable="true"
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500"
            title="Fermer (Touche B manette / Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Auto-Switched Notice Banner */}
      {autoSwitchedNotice && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-orange-950/90 via-zinc-950 to-orange-950/90 border-b border-orange-500/40 text-orange-100 text-xs flex flex-wrap items-center justify-between gap-2 z-20 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 animate-pulse" />
            <span>
              ✨ <strong>Adaptation automatique :</strong> « {title} » ({currentMedia.original_language?.toUpperCase()}) n'a aucun doublage VF officiel. Erodium a directement lancé <strong>VOSTFR (1080p)</strong> pour vous éviter toute erreur 404.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLanguageChange("vf")}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-300 hover:text-white text-[11px] border border-white/10 transition-colors cursor-pointer"
            >
              Tester quand même en VF
            </button>
            <button
              onClick={() => setAutoSwitchedNotice(false)}
              className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Masquer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Foreign Language Guidance Banner (if user deliberately switches to VF) */}
      {!autoSwitchedNotice &&
        selectedLanguage === "vf" &&
        currentMedia.original_language &&
        !["fr", "en"].includes(currentMedia.original_language) && (
          <div className="px-4 py-2 bg-orange-950/90 border-b border-orange-500/30 text-orange-200 text-xs flex flex-wrap items-center justify-between gap-2 z-20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                💡 <strong>« {title} »</strong> est une œuvre originale ({currentMedia.original_language.toUpperCase()}) : si le lecteur affiche <em>404 Content not found</em>, cliquez sur <strong>VOSTFR</strong> ou <strong>1080p / 4K</strong>.
              </span>
            </div>
            <button
              onClick={() => handleLanguageChange("vostfr")}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>💬 Passer en VOSTFR (1080p)</span>
            </button>
          </div>
        )}

      {/* Asian / Web Series Banner (e.g. The Loyal Pin, IdolFactory, GMMTV, Thai BL/GL) */}
      {isWebDrama && (
        <div className="px-4 py-2 bg-gradient-to-r from-red-950/90 via-zinc-900 to-orange-950/90 border-b border-red-500/40 text-xs flex flex-wrap items-center justify-between gap-2 z-20 animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] tracking-wide uppercase shadow-sm">
              Web Série
            </span>
            <span className="text-zinc-200">
              « <strong>{title}</strong> » est une web série officielle (YouTube / IdolFactory / GMMTV). Si un serveur retourne <em>500 Server Error</em> ou <em>Unavailable</em> :
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const pm = availableServers.find((s) => s.id.includes("pm")) || availableServers[0];
                setSelectedServer(pm);
                setIframeKey((k) => k + 1);
              }}
              className="px-2.5 py-1 rounded-lg bg-orange-600/80 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              title="Tester le serveur miroir VidSrc PM"
            >
              <span>⚡ Tester VidSrc PM</span>
            </button>
            <button
              onClick={() => {
                const me = availableServers.find((s) => s.id.includes("multiembed")) || availableServers[0];
                setSelectedServer(me);
                setIframeKey((k) => k + 1);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              title="Tester le miroir MultiEmbed"
            >
              <span>⚡ MultiEmbed</span>
            </button>
            <button
              onClick={handleLaunchYouTubeOfficial}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ouvrir l'épisode intégral officiel sur YouTube en 1080p FHD"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>▶️ Épisode Officiel YouTube (1080p FHD)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="flex-1 min-h-0 relative w-full bg-black flex items-center justify-center overflow-hidden">
        {playerMode === "hls" ? (
          isHlsLoading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-sm font-semibold">Recherche de flux direct 1080p en cours...</span>
            </div>
          ) : directStreamUrl ? (
            <div className="w-full h-full relative">
              {isDemoActive && (
                <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-md bg-amber-500/80 text-black text-xs font-bold shadow-md">
                  🐰 Démo Technique MUX (Big Buck Bunny)
                </div>
              )}
              <HlsPlayer
                key={directStreamUrl}
                streamUrl={directStreamUrl}
                title={isDemoActive ? "Démo Technique HLS - Big Buck Bunny" : title}
                poster={
                  currentMedia.backdrop_path
                    ? `https://image.tmdb.org/t/p/w1280${currentMedia.backdrop_path}`
                    : undefined
                }
                onEnded={handleNextEpisode}
                videoFilter={videoFilter}
                onVideoRef={(el) => { hlsVideoRef.current = el; }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto animate-fade-in">
              {hlsStatus?.reason === "unreleased" ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                    <AlertCircle className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Film non encore sorti !</h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed">
                    <strong>« {title} »</strong> n'est pas encore sorti en salle ou en streaming (date de sortie annoncée : <strong>{hlsStatus.releaseDate || "Prochainement"}</strong>). Aucun fichier vidéo ni flux direct n'existe encore nulle part.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all"
                  >
                    Retourner au catalogue
                  </button>
                </>
              ) : hlsStatus?.reason === "debrid_error" ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Compte Real-Debrid Expiré</h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed">
                    Votre clé API a bien été configurée, mais votre compte Real-Debrid est actuellement <strong>EXPIRÉ</strong> (comme affiché sur votre compte Real-Debrid). Les serveurs bloquent la génération du flux direct.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    <button
                      onClick={() => setPlayerMode("embed")}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Regarder sur Serveur 1 VF (Gratuit)</span>
                    </button>
                    <a
                      href="https://real-debrid.com/premium"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold text-xs border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Renouveler Real-Debrid</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              ) : hlsStatus?.reason === "no_streams" ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                    <AlertCircle className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Aucun flux débridé trouvé</h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed">
                    Aucun fichier haute fidélité n'a pu être extrait pour <strong>« {title} »</strong>. Vous pouvez le regarder immédiatement via nos serveurs de streaming intégrés.
                  </p>
                  <button
                    onClick={() => setPlayerMode("embed")}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Basculer sur Serveur 1 VF</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Lecteur HLS Natif (0 Pub)</h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed">
                    Pour diffuser <strong>« {title} »</strong> directement dans notre lecteur HTML5 personnalisé sans aucune pub ni redirection externe, une clé <strong>Real-Debrid</strong> ou <strong>AllDebrid</strong> est requise (à renseigner dans Paramètres) pour débrider les fichiers sources 1080p/4K sans DRM.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    <button
                      onClick={() => setPlayerMode("embed")}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Regarder sur Serveur 1 VF</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsDemoActive(true);
                        setDirectStreamUrl("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                    >
                      🐰 Tester le lecteur vidéo (Démo)
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        ) : isResolving ? (
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm font-semibold">Synchronisation des flux vidéo HD en cours...</span>
          </div>
        ) : activeServer?.isAnimeSama && isAnimeLoading ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto animate-fade-in gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <h3 className="text-base font-bold text-white">Connexion au Lecteur Erodium...</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Récupération du véritable doublage VF officiel pour « <strong>{title}</strong> » (Saison {season}, Épisode {episode})...
            </p>
          </div>
        ) : activeServer?.isAnimeSama && animeError && !animeStreamUrl ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Non disponible sur ce lecteur</h3>
            <p className="text-xs text-zinc-300 mb-5 max-w-md leading-relaxed">
              {animeError}
            </p>
            <button
              onClick={() => {
                const altServer = availableServers.find((s) => !s.isAnimeSama) || availableServers[1];
                setSelectedServer(altServer);
                setIframeKey((k) => k + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
            >
              ⚡ Basculer sur un autre lecteur
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <iframe
              key={`${selectedServer.id}-${currentMedia.id}-${season}-${episode}-${iframeKey}-${animeStreamUrl || ""}`}
              src={currentEmbedUrl}
              title={title}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={videoFilter ? { filter: videoFilter, transition: "filter 0.3s" } : undefined}
              className="w-full h-full border-0 absolute inset-0"
            />

            {/* In-Player Rescue Bar (Floating overlay at top of video) */}
            {!activeServer?.isAnimeSama &&
              selectedLanguage === "vf" &&
              currentMedia.original_language &&
              currentMedia.original_language !== "fr" && (() => {
                const mediaOrigin = getMediaLanguageInfo(currentMedia);
                return (
                  <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 pointer-events-auto animate-fade-in">
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-950/95 backdrop-blur-md border border-amber-500/40 text-amber-200 text-xs shadow-2xl max-w-xl">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="truncate">
                        Écran noir ou <strong>Error 404</strong> ? Pas de VF disponible pour cette œuvre.
                      </span>
                      <button
                        onClick={() => handleLanguageChange("vostfr")}
                        className="px-3 py-1 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-orange-600/30 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <span>▶️ Lancer en VOSTFR ({mediaOrigin.flag}/🇫🇷)</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
        )}
      </div>

      {/* Bottom Bar: HLS mode banner with Filters and Stream Switcher */}
      {playerMode === "hls" ? (
        <div className="p-3 sm:p-4 border-t border-white/10 glass flex flex-col gap-2.5 z-20">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Real-Debrid connecté : {availableDebridStreams.length} flux haute qualité disponibles.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-400 hidden md:inline">
                💡 <strong className="text-zinc-300">Pas de son ?</strong> Choisissez une source avec le badge vert <strong>AAC</strong>.
              </span>
              <button
                onClick={() => setPlayerMode("embed")}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Basculer sur serveurs gratuits (AutoEmbed)
              </button>
            </div>
          </div>

          {/* Filter Pills Row */}
          {availableDebridStreams.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pt-1 pb-1 scrollbar-none border-b border-white/5">
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mr-2 flex-shrink-0">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span>Filtrer :</span>
              </div>

              {availableDebridStreams.filter((s) => s.isFrench && !s.isAudioDescription).length > 0 && (
                <button
                  onClick={() => setSourceFilter("vf")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === "vf"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  <span>🇫🇷 VF (Standard)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                    {availableDebridStreams.filter((s) => s.isFrench && !s.isAudioDescription).length}
                  </span>
                </button>
              )}

              {availableDebridStreams.filter((s) => s.isVostfr).length > 0 && (
                <button
                  onClick={() => setSourceFilter("vostfr")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === "vostfr"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  <span>💬 VOSTFR</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                    {availableDebridStreams.filter((s) => s.isVostfr).length}
                  </span>
                </button>
              )}

              {availableDebridStreams.filter((s) => s.hasAac).length > 0 && (
                <button
                  onClick={() => setSourceFilter("aac")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === "aac"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                  title="Sources avec audio AAC (son 100% garanti sur Chrome, Opera, etc.)"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Son Garanti (AAC)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                    {availableDebridStreams.filter((s) => s.hasAac).length}
                  </span>
                </button>
              )}

              {availableDebridStreams.filter((s) => s.isCached).length > 0 && (
                <button
                  onClick={() => setSourceFilter("rd_plus")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === "rd_plus"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  <span>⚡ En cache [RD+]</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                    {availableDebridStreams.filter((s) => s.isCached).length}
                  </span>
                </button>
              )}

              {availableDebridStreams.filter((s) => s.is4K).length > 0 && (
                <button
                  onClick={() => setSourceFilter("4k")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === "4k"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  <span>🌐 4K Ultra HD</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                    {availableDebridStreams.filter((s) => s.is4K).length}
                  </span>
                </button>
              )}

              {availableDebridStreams.filter((s) => s.is1080p).length > 0 && (
                <button
                  onClick={() => setSourceFilter("1080p")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === "1080p"
                      ? "bg-zinc-600 text-white shadow-md"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  <span>1080p FHD</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                    {availableDebridStreams.filter((s) => s.is1080p).length}
                  </span>
                </button>
              )}

              <button
                onClick={() => setSourceFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  sourceFilter === "all"
                    ? "bg-zinc-200 text-zinc-900 shadow-md font-extrabold"
                    : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                <span>Tous</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {availableDebridStreams.length}
                </span>
              </button>
            </div>
          )}

          {/* Sources List Row */}
          {(() => {
            const filtered = availableDebridStreams.filter((s) => {
              if (sourceFilter === "vf") return s.isFrench && !s.isAudioDescription && !s.isVF2;
              if (sourceFilter === "vostfr") return s.isVostfr;
              if (sourceFilter === "aac") return s.hasAac;
              if (sourceFilter === "rd_plus") return s.isCached;
              if (sourceFilter === "4k") return s.is4K;
              if (sourceFilter === "1080p") return s.is1080p;
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="py-2 text-center text-xs text-zinc-400">
                  <span>Aucune source ne correspond au filtre <strong>{sourceFilter.toUpperCase()}</strong>. </span>
                  <button
                    onClick={() => setSourceFilter("all")}
                    className="text-emerald-400 underline font-semibold ml-1"
                  >
                    Afficher toutes les sources
                  </button>
                </div>
              );
            }

            return (
              <div className="relative flex items-center w-full gap-2">
                {/* Scroll Left Button */}
                <button
                  onClick={() => scrollSources(-1)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 flex-shrink-0 transition-colors hidden sm:flex items-center justify-center"
                  title="Défiler vers la gauche"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Sources Scrollable Row */}
                <div
                  ref={sourcesScrollRef}
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-2 overflow-x-auto w-full pt-1 pb-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 scroll-smooth"
                >
                  {filtered.map((stream, idx) => {
                    const isSelected = directStreamUrl === stream.url;
                    const rawName = stream.name?.replace("Torrentio\n", "") || `Source ${idx + 1}`;

                    return (
                      <button
                        key={`${stream.url}-${idx}`}
                        onClick={() => {
                          setSelectedDebridIndex(stream.streamIndex);
                          setDirectStreamUrl(stream.url);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border flex-shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-105 ring-1 ring-white/20"
                            : "bg-zinc-800/90 text-zinc-300 hover:text-white border-white/5 hover:bg-zinc-700 hover:border-white/10"
                        }`}
                        title={stream.title}
                      >
                        <span>{rawName}</span>

                        {stream.isAudioDescription ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 text-[10px] font-bold border border-purple-500/30">
                            👀 Audio-Description (AD)
                          </span>
                        ) : stream.isVF2 ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 text-[10px] font-bold border border-amber-500/30">
                            ⚠️ VF2 (Secondaire / AD)
                          </span>
                        ) : stream.isFrench ? (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/40 text-indigo-200 text-[10px] font-bold border border-indigo-500/30">
                            🇫🇷 VF Standard
                          </span>
                        ) : null}

                        {stream.is4K ? (
                          <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[10px] font-bold">
                            4K
                          </span>
                        ) : stream.is1080p ? (
                          <span className="px-1 py-0.2 rounded bg-zinc-700 text-zinc-300 text-[10px]">
                            1080p
                          </span>
                        ) : null}

                        {/* Audio compatibility badge */}
                        {stream.hasAac ? (
                          <span
                            className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-bold flex items-center gap-0.5 border border-emerald-500/20"
                            title="Format audio AAC garanti 100% compatible avec votre navigateur"
                          >
                            <Volume2 className="w-2.5 h-2.5" />
                            <span>AAC</span>
                          </span>
                        ) : stream.hasDts || stream.hasEac3 ? (
                          <span
                            className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] flex items-center gap-0.5"
                            title="Format audio DTS/EAC3 : peut nécessiter un lecteur externe comme VLC si muet"
                          >
                            <VolumeX className="w-2.5 h-2.5" />
                            <span>{stream.hasDts ? "DTS" : "EAC3"}</span>
                          </span>
                        ) : null}

                        {stream.size && (
                          <span className="text-[10px] text-zinc-400">
                            {stream.size}
                          </span>
                        )}

                        <span className="text-[10px] opacity-50">#{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scroll Right Button */}
                <button
                  onClick={() => scrollSources(1)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 flex-shrink-0 transition-colors hidden sm:flex items-center justify-center"
                  title="Défiler vers la droite"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Full List Modal Trigger */}
                <button
                  onClick={() => setShowAllSourcesModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-white/10 flex-shrink-0 flex items-center gap-1.5 transition-colors"
                  title="Ouvrir la liste complète des sources avec recherche"
                >
                  <List className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden md:inline">Voir tout</span>
                </button>
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          {/* VidMoly / FrEmbed Advisory Banner for DNS blocked hosts like Doodstream */}
          {(selectedServer.id.startsWith("frembed") || selectedServer.id === "vidmoly_vf") && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-2 z-20">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Astuce VidMoly :</strong> Si le lecteur affiche <em>« Ce site est inaccessible »</em>, cliquez sur <strong>SERVEURS</strong> à gauche dans la vidéo et sélectionnez <strong>Vidmoly</strong> ou <strong>Uqload</strong> (Dood étant bloqué par les opérateurs français).
                </span>
              </div>
              <button
                onClick={() => {
                  const altServer = availableServers.find((s) => !s.id.startsWith("frembed") && s.id !== "vidmoly_vf") || availableServers[1] || availableServers[0];
                  setSelectedServer(altServer);
                  setIframeKey((k) => k + 1);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
              >
                ⚡ Passer sur {availableServers[0]?.name?.split("(")[0] || "Serveur 1"}
              </button>
            </div>
          )}

          {/* Servers & Language Guidance */}
          <div className="p-3 sm:p-4 border-t border-white/10 glass flex flex-col gap-2.5 z-20">
            {/* Erodium Alternate Players Row */}
            {selectedServer?.isAnimeSama && animeData?.players?.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 scrollbar-none border-b border-white/5 animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Hébergeurs Erodium :</span>
                </div>
                {animeData.players.map((p, idx) => (
                  <button
                    key={p.url || idx}
                    onClick={() => {
                      setAnimeStreamUrl(p.url);
                      setIframeKey((k) => k + 1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      animeStreamUrl === p.url
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 scale-105 border border-orange-400"
                        : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-white/5"
                    }`}
                  >
                    {p.name?.replace("Lecteur", "Hébergeur") || `Hébergeur ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              {/* Server Selectors for the active language */}
              <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mr-1 flex-shrink-0">
                  <Server className="w-3.5 h-3.5 text-orange-400" />
                  <span>Lecteurs ({selectedLanguage.toUpperCase()}) :</span>
                </div>

                {/* Bouton Serveur Suivant Rapide */}
                <button
                  onClick={handleNextServer}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer"
                  title="Tester automatiquement le serveur suivant si celui-ci ne charge pas ou affiche 404"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>⚡ Suivant</span>
                </button>

                {availableServers.map((server) => {
                  const isSelected = selectedServer.id === server.id;
                  const details = getServerDetails(server, currentMedia, selectedLanguage);
                  return (
                    <button
                      key={server.id}
                      onClick={() => {
                        setSelectedServer(server);
                        setIframeKey((k) => k + 1);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 border flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 font-bold border-orange-400 scale-[1.02] ring-1 ring-white/20"
                          : "bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-white/5 hover:border-white/15"
                      }`}
                      title={details.description}
                    >
                      {/* Drapeau national bien visible */}
                      <span className="text-sm">{details.flagDisplay}</span>

                      {/* Nom du serveur */}
                      <span className="font-semibold">
                        {server.name.replace(/Serveur \d+ \((.*?)\)/, "$1")}
                      </span>

                      {/* Badge langue précis */}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected
                            ? "bg-white/20 text-white border border-white/30"
                            : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        }`}
                      >
                        {details.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Assistance Rapide : Changer de flux ou de langue en 1 clic */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-300 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-white/5 w-full lg:w-auto justify-center lg:justify-end">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="hidden sm:inline">Vidéo 404 ou bloquée ?</span>
                </div>
                <button
                  onClick={handleNextServer}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-semibold transition-colors cursor-pointer"
                  title="Passer au serveur miroir suivant"
                >
                  ⚡ Serveur suivant
                </button>
                {selectedLanguage === "vf" ? (
                  <button
                    onClick={() => handleLanguageChange("vostfr")}
                    className="px-2.5 py-0.5 rounded bg-orange-600/80 hover:bg-orange-600 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Passer en VOSTFR sous-titré français"
                  >
                    <Languages className="w-3 h-3" />
                    <span>💬 Tester en VOSTFR</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleLanguageChange("multi")}
                    className="px-2.5 py-0.5 rounded bg-amber-600/80 hover:bg-amber-600 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Passer sur le serveur multi-langues"
                  >
                    <Globe className="w-3 h-3" />
                    <span>🌐 Tester Multi / 4K</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bandeau explicatif du lecteur actif : Audio, Sous-titres et Drapeau */}
            {(() => {
              const activeDetails = getServerDetails(selectedServer, currentMedia, selectedLanguage);
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5 text-[11px] text-zinc-300">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{activeDetails.flagDisplay}</span>
                    <span className="font-bold text-white">{selectedServer.name} :</span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30">
                      🔊 {activeDetails.audio}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      💬 {activeDetails.subs}
                    </span>
                    {selectedServer.badge?.includes("DoH") && (
                      <button
                        onClick={() => setShowDnsModal(true)}
                        className="px-2 py-0.5 rounded bg-orange-600/90 hover:bg-orange-500 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                        title="Afficher les étapes simples pour débloquer ce lecteur chez votre FAI"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Contourner le blocage FAI (DNS)</span>
                      </button>
                    )}
                  </div>
                  <div className="text-zinc-400 text-[10px] hidden md:flex items-center gap-1">
                    <span>💡 {activeDetails.description}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Full Sources Modal Dialog */}
      {showAllSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowAllSourcesModal(false)}
          />

          <div className="relative w-full max-w-2xl bg-zinc-950 rounded-2xl border border-white/10 shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Toutes les sources Real-Debrid ({availableDebridStreams.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAllSourcesModal(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-white/5 bg-zinc-900/50 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher par nom, format (ex: truefrench, aac, 4k, 1080p, web-dl)..."
                value={sourceSearchQuery}
                onChange={(e) => setSourceSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              {sourceSearchQuery && (
                <button
                  onClick={() => setSourceSearchQuery("")}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Scrollable list of sources */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {availableDebridStreams
                .filter((s) => {
                  if (!sourceSearchQuery.trim()) return true;
                  const q = sourceSearchQuery.toLowerCase();
                  return (
                    s.title?.toLowerCase().includes(q) ||
                    s.name?.toLowerCase().includes(q)
                  );
                })
                .map((stream, idx) => {
                  const isSelected = directStreamUrl === stream.url;
                  return (
                    <div
                      key={`${stream.url}-${idx}`}
                      onClick={() => {
                        setSelectedDebridIndex(stream.streamIndex);
                        setDirectStreamUrl(stream.url);
                        setShowAllSourcesModal(false);
                      }}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 border ${
                        isSelected
                          ? "bg-emerald-600/20 border-emerald-500 text-white"
                          : "bg-zinc-900/40 hover:bg-zinc-800/80 border-white/5 text-zinc-300"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white">
                            {stream.name?.replace("Torrentio\n", "")}
                          </span>
                          {stream.isAudioDescription ? (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 text-[10px] font-bold">
                              👀 Audio-Description (AD)
                            </span>
                          ) : stream.isVF2 ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                              ⚠️ VF2 (Piste secondaire / AD)
                            </span>
                          ) : stream.isFrench ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                              🇫🇷 VF Standard
                            </span>
                          ) : null}

                          {stream.hasAac && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-bold flex items-center gap-0.5">
                              <Volume2 className="w-2.5 h-2.5" />
                              <span>AAC (Son OK)</span>
                            </span>
                          )}

                          {stream.isCached && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                              ⚡ RD+ Instantané
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 truncate max-w-xl">
                          {stream.filename}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                        {stream.size && (
                          <span className="text-xs font-semibold text-zinc-400">
                            {stream.size}
                          </span>
                        )}
                        <button
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-emerald-500 text-white"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                          }`}
                        >
                          {isSelected ? "En lecture" : "Lire"}
                        </button>
                      </div>
                    </div>
              );
            })}
        </div>
      </div>
    </div>
  )}

      {/* Season & Episode Selector Drawer / Modal */}
      {showEpisodeDrawer && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/80 backdrop-blur-md animate-fade-in">
          {/* Backdrop click to close */}
          <div
            className="flex-1 hidden md:block cursor-pointer"
            onClick={() => setShowEpisodeDrawer(false)}
          />

          {/* Drawer content */}
          <div className="w-full md:max-w-xl lg:max-w-2xl bg-zinc-950/95 border-l border-white/10 flex flex-col h-full shadow-2xl z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-zinc-900/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-orange-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    Choisir un épisode
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {title} • Saison {drawerSeason} ({drawerEpisodes.length} épisodes)
                </p>
              </div>

              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Fermer le sélecteur"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seasons Tabs Selector */}
            {seriesDetails?.seasons && seriesDetails.seasons.length > 0 && (
              <div className="p-3 border-b border-white/10 bg-black/30 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">
                {seriesDetails.seasons
                  .filter((s) => s.season_number > 0 || seriesDetails.seasons.length === 1)
                  .map((s) => {
                    const isCurrentTab = drawerSeason === s.season_number;
                    const isPlayingSeason = season === s.season_number;
                    return (
                      <button
                        key={s.id || s.season_number}
                        onClick={() => setDrawerSeason(s.season_number)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer border ${
                          isCurrentTab
                            ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-400 shadow-md shadow-orange-600/30"
                            : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border-white/5"
                        }`}
                      >
                        <span>{s.name || `Saison ${s.season_number}`}</span>
                        {isPlayingSeason && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        <span className="text-[10px] opacity-60">({s.episode_count || "?"})</span>
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Episodes List Viewport */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {isLoadingDrawerEpisodes ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                  <span className="text-xs font-semibold">Chargement des épisodes de la saison {drawerSeason}...</span>
                </div>
              ) : drawerEpisodes.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  Aucun épisode répertorié pour cette saison.
                </div>
              ) : (
                drawerEpisodes.map((ep) => {
                  const isCurrentPlaying =
                    season === drawerSeason && episode === ep.episode_number;

                  return (
                    <div
                      key={ep.id || ep.episode_number}
                      onClick={() => handleSelectEpisode(drawerSeason, ep.episode_number)}
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 sm:gap-4 items-center group ${
                        isCurrentPlaying
                          ? "bg-orange-950/40 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-950/50"
                          : "bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* Episode Thumbnail */}
                      <div className="w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                        {ep.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                            alt={ep.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                            <Tv className="w-6 h-6" />
                          </div>
                        )}

                        {/* Play button overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
                          </div>
                        </div>

                        {/* Episode badge over image */}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-black text-[10px] backdrop-blur-sm">
                          EP {ep.episode_number}
                        </div>
                      </div>

                      {/* Episode Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isCurrentPlaying ? "text-orange-300" : "text-zinc-200 group-hover:text-white"
                            }`}
                          >
                            {ep.name || `Épisode ${ep.episode_number}`}
                          </h4>

                          {isCurrentPlaying && (
                            <span className="px-2 py-0.5 rounded-full bg-orange-600/30 border border-orange-500/40 text-orange-200 text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>En lecture</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
                          {ep.runtime ? <span>{ep.runtime} min</span> : null}
                          {ep.runtime && ep.air_date ? <span>•</span> : null}
                          {ep.air_date ? <span>{ep.air_date}</span> : null}
                        </div>

                        {ep.overview && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
              <span>Astuce : Vous pouvez aussi naviguer avec les flèches du lecteur.</span>
              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Guide de Contournement DNS FAI */}
      <DnsHelpModal
        isOpen={showDnsModal}
        onClose={() => setShowDnsModal(false)}
      />
    </div>
  );
}
