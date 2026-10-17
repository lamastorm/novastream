import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Heart,
  Plus,
  Check,
  Star,
  Share2,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Loader2,
  ExternalLink,
  Search,
  Film,
  RotateCcw,
} from "lucide-react";
import { tmdbApi, IMAGE_BASE_URL } from "../api/tmdb";
import { languageAdvisor } from "../services/languageAdvisor";
import { storage } from "../services/storage";

const safeGetYear = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const y = d.getFullYear();
  return isNaN(y) ? "" : String(y);
};

const safeFormatRating = (val) => {
  const num = Number(val);
  return !isNaN(num) && num > 0 ? num.toFixed(1) : null;
};

export default function DetailModal({
  media: initialMedia,
  onClose,
  onPlay,
  isFavorite,
  onToggleFavorite,
}) {
  const [activeMedia, setActiveMedia] = useState(initialMedia);
  const [details, setDetails] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedLang, setSelectedLang] = useState(
    languageAdvisor.getRecommendedLanguage(initialMedia)
  );
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorCredits, setActorCredits] = useState([]);
  const [actorLoading, setActorLoading] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    setActiveMedia(initialMedia);
    setShowTrailerModal(false);
  }, [initialMedia]);

  const isExplicitMovie = activeMedia?.media_type === "movie" || details?.media_type === "movie";
  const isExplicitTV = activeMedia?.media_type === "tv" || details?.media_type === "tv";

  const isTV = isExplicitMovie
    ? false
    : isExplicitTV ||
      Boolean(details?.seasons?.length) ||
      Boolean(details?.first_air_date) ||
      (Boolean(activeMedia?.first_air_date) && !activeMedia?.release_date) ||
      activeMedia?.source === "anime-sama" ||
      activeMedia?.source === "anilist" ||
      activeMedia?.source === "mal" ||
      String(activeMedia?.id).startsWith("as_");
  const mediaType = isTV ? "tv" : "movie";

  useEffect(() => {
    if (!activeMedia) return;
    let isMounted = true;
    setLoading(true);
    setCollectionData(null);

    const loadData = async () => {
      let targetId = activeMedia.id;
      let targetType = mediaType;

      const isExternalId = isNaN(Number(activeMedia.id)) || String(activeMedia.id).startsWith("as_");
      if (
        activeMedia.source === "mal" ||
        activeMedia.source === "anilist" ||
        activeMedia.source === "tvmaze" ||
        activeMedia.source === "anime-sama" ||
        isExternalId
      ) {
        try {
          const titleToSearch = activeMedia.title || activeMedia.name;
          const searchRes = await tmdbApi.searchMulti(titleToSearch);
          const results = searchRes.results || [];
          const isAnimeSource =
            activeMedia.source === "anime-sama" ||
            activeMedia.source === "anilist" ||
            activeMedia.source === "mal";

          let match = null;
          if (isAnimeSource) {
            match =
              results.find(
                (r) =>
                  r.media_type === "tv" &&
                  r.original_language === "ja" &&
                  r.genre_ids?.includes(16) &&
                  (r.poster_path || r.backdrop_path)
              ) ||
              results.find(
                (r) =>
                  r.media_type === "tv" &&
                  r.original_language === "ja" &&
                  (r.poster_path || r.backdrop_path)
              ) ||
              results.find(
                (r) =>
                  (r.media_type === "tv" || r.media_type === "movie") &&
                  (r.poster_path || r.backdrop_path)
              ) ||
              results[0];
          } else {
            match =
              results.find(
                (r) =>
                  (r.media_type === "tv" || r.media_type === "movie") &&
                  (r.poster_path || r.backdrop_path)
              ) || results[0];
          }

          if (match) {
            targetId = match.id;
            targetType = match.media_type || targetType;
          }
        } catch (e) {
          console.error("Erreur résolution TMDB:", e);
        }
      }

      try {
        const data = await tmdbApi.getDetails(targetType, targetId);
        if (!isMounted) return;
        setDetails(data);
        if (languageAdvisor.hasNoOfficialVF(data)) {
          setSelectedLang("vostfr");
        }
        setLoading(false);

        if (data.belongs_to_collection?.id) {
          tmdbApi
            .getCollection(data.belongs_to_collection.id)
            .then((col) => {
              if (isMounted && col) setCollectionData(col);
            })
            .catch(() => {});
        }

        if (targetType === "tv" && data.seasons && data.seasons.length > 0) {
          const firstRegularSeason =
            data.seasons.find((s) => s.season_number > 0) || data.seasons[0];
          setSelectedSeason(firstRegularSeason.season_number);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeMedia?.id, activeMedia?.source]);

  useEffect(() => {
    if (!details?.id || !isTV) return;
    let isMounted = true;
    setLoadingEpisodes(true);

    tmdbApi
      .getSeasonEpisodes(details.id, selectedSeason)
      .then((data) => {
        if (!isMounted) return;
        setEpisodes(data.episodes || []);
        setLoadingEpisodes(false);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [details?.id, selectedSeason, isTV]);

  if (!activeMedia) return null;

  const currentMediaTarget = details || activeMedia;
  const isNoVF = languageAdvisor.hasNoOfficialVF(currentMediaTarget);

  const isAnimeSamaSource =
    activeMedia.source === "anime-sama" ||
    activeMedia.source === "anilist" ||
    activeMedia.source === "mal" ||
    String(activeMedia.id).startsWith("as_");

  const isUnreleasedSeries =
    isTV &&
    !isAnimeSamaSource &&
    (details?.status === "In Production" ||
      details?.status === "Planned" ||
      (details?.first_air_date && new Date(details.first_air_date) > new Date()) ||
      (!loading && episodes.length === 0 && !loadingEpisodes && details?.number_of_episodes === 0));

  const title = details?.title || details?.name || activeMedia.title || activeMedia.name;
  const originalTitle = details?.original_title || details?.original_name || title;
  const releaseDateStr =
    details?.release_date ||
    details?.first_air_date ||
    activeMedia?.release_date ||
    activeMedia?.first_air_date ||
    "";
  const year = safeGetYear(releaseDateStr);
  const rating = safeFormatRating(details?.vote_average || activeMedia?.vote_average);

  const backdropUrl =
    details?.backdrop_path || activeMedia.backdrop_path
      ? `${IMAGE_BASE_URL}/original${details?.backdrop_path || activeMedia.backdrop_path}`
      : null;
  const posterUrl =
    details?.poster_path || activeMedia.poster_path
      ? `${IMAGE_BASE_URL}/w500${details?.poster_path || activeMedia.poster_path}`
      : null;

  // Official TMDB Logo (fr -> en -> first available)
  const logos = details?.images?.logos || [];
  const bestLogo =
    logos.find((l) => l.iso_639_1 === "fr") ||
    logos.find((l) => l.iso_639_1 === "en") ||
    logos[0];
  const logoUrl = bestLogo?.file_path ? `${IMAGE_BASE_URL}/w500${bestLogo.file_path}` : null;

  const historyList = storage.getHistory();
  const lastWatchedItem = historyList.find((h) => {
    const idMatch =
      String(h.id) === String(activeMedia.id) ||
      (details?.id && String(h.id) === String(details.id));
    const titleMatch =
      (h.title &&
        (h.title === activeMedia.title ||
          h.title === activeMedia.name ||
          h.title === details?.title ||
          h.title === details?.name)) ||
      (h.name &&
        (h.name === activeMedia.name ||
          h.name === activeMedia.title ||
          h.name === details?.name ||
          h.name === details?.title));
    return idMatch || titleMatch;
  });

  const resumeSeason = Number(lastWatchedItem?.season) || selectedSeason || 1;
  const resumeEpisode = Number(lastWatchedItem?.episode) || 1;
  const hasHistoryResume = Boolean(
    lastWatchedItem &&
      (isTV
        ? lastWatchedItem.season !== undefined || lastWatchedItem.episode !== undefined
        : true)
  );

  const trailer = details?.videos?.results?.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );

  const genresText = Array.isArray(details?.genres)
    ? details.genres.map((g) => g?.name).filter(Boolean).join(", ")
    : "";

  const seasonsCount = details?.number_of_seasons || (details?.seasons ? details.seasons.filter((s) => s.season_number > 0).length : null);

  const metaLineParts = [
    rating ? `★ ${rating}` : null,
    year,
    isTV && seasonsCount ? `${seasonsCount} saison${seasonsCount > 1 ? "s" : ""}` : null,
    !isTV && details?.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null,
    genresText,
  ].filter(Boolean);

  const launchPlay = (seasonNum = 1, episodeNum = 1) => {
    const targetMedia = {
      ...activeMedia,
      ...details,
      id: details?.id || activeMedia.id,
      media_type: isTV ? "tv" : "movie",
      title: details?.name || details?.title || activeMedia.title,
      original_language: details?.original_language || activeMedia.original_language,
    };
    onPlay(targetMedia, seasonNum, episodeNum, isNoVF ? "vostfr" : selectedLang);
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white overflow-y-auto animate-fade-in select-none">
      {/* HERO BACKDROP SECTION (Matches SkyStream Screenshot 1) */}
      <div className="relative w-full min-h-[430px] sm:min-h-[520px] flex items-end overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.65]"
          />
        )}
        {/* Smooth multi-directional vignette into #050507 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/95 via-[#050507]/55 to-transparent" />

        {/* Top-left "‹ Retour" Pill Button */}
        <div className="absolute top-6 left-4 sm:left-8 z-30">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-lg"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Retour</span>
          </button>
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-8 pt-24">
          {/* Animated Orange & Violet Badge (SÉRIE / FILM) */}
          <div className="mb-3">
            <span className="inline-block bg-erodium-gradient glow-erodium text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded shadow">
              {isTV ? "SÉRIE" : "FILM"}
            </span>
          </div>

          {/* Official TMDB Logo (e.g. GAME OF THRONES) or Bold Title */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={title}
              className="max-h-24 sm:max-h-32 max-w-[280px] sm:max-w-[420px] w-auto object-contain object-left mb-3 drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
            />
          ) : (
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-3 drop-shadow-lg max-w-2xl">
              {title}
            </h1>
          )}

          {/* Metadata Line: ★ 8.5 · 2011 · 8 saisons · Genres */}
          <p className="text-xs sm:text-[13px] font-medium text-zinc-300 mb-5 max-w-2xl">
            {metaLineParts.join(" · ")}
          </p>

          {/* SkyStream Action Bar */}
          {isUnreleasedSeries ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>En production — Sortie prochainement</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Primary Orange & Violet Gradient Lecture Button */}
              <button
                onClick={() =>
                  launchPlay(
                    isTV ? (hasHistoryResume ? resumeSeason : selectedSeason) : 1,
                    isTV ? (hasHistoryResume ? resumeEpisode : 1) : 1
                  )
                }
                className="flex items-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl bg-erodium-gradient glow-erodium text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-[1.04] active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {isTV
                    ? `Lecture S${hasHistoryResume ? resumeSeason : selectedSeason}E${
                        hasHistoryResume ? resumeEpisode : 1
                      }`
                    : "Lecture"}
                </span>
              </button>

              {/* Restart S1E1 if user has history */}
              {isTV && hasHistoryResume && (resumeSeason > 1 || resumeEpisode > 1) && (
                <button
                  onClick={() => launchPlay(1, 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/85 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>S1E1</span>
                </button>
              )}

              {/* Bande-annonce Button */}
              {trailer && (
                <button
                  onClick={() => setShowTrailerModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/85 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer"
                >
                  <Film className="w-4 h-4 text-orange-400" />
                  <span>Bande-annonce</span>
                </button>
              )}

              {/* Circular Heart Button */}
              <button
                onClick={() => onToggleFavorite(activeMedia)}
                title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  isFavorite
                    ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                    : "bg-zinc-900/85 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-orange-400" : ""}`} />
              </button>

              {/* Circular Watchlist + Button */}
              <button
                onClick={() => onToggleFavorite(activeMedia)}
                title="Ma liste"
                className="w-10 h-10 rounded-full bg-zinc-900/85 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                {isFavorite ? <Check className="w-4 h-4 text-orange-400" /> : <Plus className="w-4 h-4" />}
              </button>

              {/* Circular Star Button */}
              <button
                onClick={() => onToggleFavorite(activeMedia)}
                title="Noter"
                className="w-10 h-10 rounded-full bg-zinc-900/85 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <Star className="w-4 h-4" />
              </button>

              {/* Partager Pill Button */}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-zinc-900/85 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                <span>{copiedShare ? "Lien copié !" : "Partager"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN TWO-COLUMN BODY (Matches SkyStream Screenshot 1 & 2) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-20 pt-2 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        {/* LEFT COLUMN: Synopsis + Épisodes + Casting + Recommandations */}
        <div className="space-y-10 min-w-0">
          {/* Synopsis */}
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mb-2.5">
              Synopsis
            </h3>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
              {details?.overview ||
                activeMedia.overview ||
                "Aucun synopsis disponible pour ce titre."}
            </p>
          </div>

          {/* ÉPISODES (SkyStream Season Pills + 4-Column Thumbnail Grid) */}
          {isTV && details?.seasons && (
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mb-3.5">
                Épisodes
              </h3>

              {/* Season Pills Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                {details.seasons
                  .filter((s) => s.season_number > 0)
                  .map((s) => {
                    const isActiveSeason = selectedSeason === s.season_number;
                    return (
                      <button
                        key={s.id || s.season_number}
                        onClick={() => setSelectedSeason(s.season_number)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer ${
                          isActiveSeason
                            ? "bg-erodium-gradient glow-erodium text-white shadow-md scale-105"
                            : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-purple-500/40"
                        }`}
                      >
                        Saison {s.season_number}
                      </button>
                    );
                  })}
              </div>

              {/* 4-Column Episode Cards Grid (Matches Screenshot 2) */}
              {loadingEpisodes ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Chargement des épisodes...</span>
                </div>
              ) : episodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-2">
                  {episodes.map((ep, idx) => {
                    const isHighlighted =
                      (hasHistoryResume &&
                        selectedSeason === resumeSeason &&
                        ep.episode_number === resumeEpisode) ||
                      (!hasHistoryResume && idx === 0);

                    const thumbUrl = ep.still_path
                      ? `${IMAGE_BASE_URL}/w500${ep.still_path}`
                      : backdropUrl;

                    return (
                      <div
                        key={ep.id || ep.episode_number}
                        onClick={() => launchPlay(selectedSeason, ep.episode_number)}
                        className={`group rounded-xl overflow-hidden bg-[#0d0d11] transition-all duration-300 cursor-pointer hover:scale-[1.025] flex flex-col ${
                          isHighlighted
                            ? "border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.25)]"
                            : "border border-white/10 hover:border-purple-500/50"
                        }`}
                      >
                        {/* Episode Still Image */}
                        <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={ep.name || `Épisode ${ep.episode_number}`}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                              S{selectedSeason}E{ep.episode_number}
                            </div>
                          )}

                          {/* Top-left S1E1 Badge */}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-extrabold tracking-wide backdrop-blur-sm border border-white/10">
                            S{selectedSeason}E{ep.episode_number}
                          </span>

                          {/* Center Play Hover Icon */}
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full bg-erodium-gradient glow-erodium text-white flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Episode Title Footer */}
                        <div className="p-3 flex-1 flex items-center">
                          <h5 className="text-xs font-bold text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                            {ep.name || `Épisode ${ep.episode_number}`}
                          </h5>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Aucun épisode trouvé pour cette saison.
                </div>
              )}
            </div>
          )}

          {/* CASTING SECTION (SkyStream Rectangular Portraits — Screenshot 2) */}
          {Array.isArray(details?.credits?.cast) && details.credits.cast.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mb-3.5">
                Casting
              </h3>
              <div className="flex gap-3.5 overflow-x-auto pb-3 scrollbar-none">
                {details.credits.cast
                  .filter((a) => a && a.id)
                  .slice(0, 12)
                  .map((actor) => (
                    <div
                      key={actor.id}
                      onClick={() => {
                        setSelectedActor(actor);
                        setActorCredits([]);
                        setActorLoading(true);
                        tmdbApi
                          .getPersonCredits(actor.id)
                          .then((credits) => {
                            setActorCredits(Array.isArray(credits) ? credits : []);
                            setActorLoading(false);
                          })
                          .catch(() => setActorLoading(false));
                      }}
                      className="w-24 sm:w-28 flex-shrink-0 cursor-pointer group text-center"
                    >
                      <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-orange-500/50 transition-colors mb-2">
                        {actor.profile_path ? (
                          <img
                            src={`${IMAGE_BASE_URL}/w300${actor.profile_path}`}
                            alt={actor.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">
                        {actor.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-tight">
                        {actor.character}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SAGA / COLLECTION */}
          {Array.isArray(collectionData?.parts) && collectionData.parts.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mb-3.5">
                Saga {collectionData.name}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                {collectionData.parts
                  .filter(Boolean)
                  .slice()
                  .sort((a, b) => new Date(a?.release_date || 0) - new Date(b?.release_date || 0))
                  .map((part) => {
                    const isCurrent = part.id === details?.id;
                    const partPoster = part.poster_path
                      ? `${IMAGE_BASE_URL}/w342${part.poster_path}`
                      : null;
                    return (
                      <div
                        key={part.id}
                        onClick={() => {
                          if (!isCurrent) {
                            setActiveMedia({ ...part, media_type: "movie", title: part.title });
                          }
                        }}
                        className={`group cursor-pointer rounded-xl overflow-hidden bg-[#0d0d11] border transition-all ${
                          isCurrent
                            ? "border-orange-500 ring-1 ring-orange-500"
                            : "border-white/10 hover:border-purple-500/50"
                        }`}
                      >
                        <div className="aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                          {partPoster && (
                            <img
                              src={partPoster}
                              alt={part.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-white truncate">{part.title}</p>
                          <p className="text-[10px] text-zinc-400">{safeGetYear(part.release_date)}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* RECOMMANDATIONS */}
          {Array.isArray(details?.recommendations?.results) &&
            details.recommendations.results.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white mb-3.5">
                  Titres similaires
                </h3>
                <div className="flex gap-3.5 overflow-x-auto pb-3 scrollbar-none">
                  {details.recommendations.results
                    .filter((r) => r && r.poster_path)
                    .slice(0, 10)
                    .map((rec) => {
                      const recTitle = rec.title || rec.name || "Titre";
                      return (
                        <div
                          key={rec.id}
                          onClick={() =>
                            setActiveMedia({
                              ...rec,
                              media_type: rec.media_type || (rec.title ? "movie" : "tv"),
                              title: recTitle,
                            })
                          }
                          className="w-32 sm:w-36 flex-shrink-0 group cursor-pointer"
                        >
                          <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-white/25 transition-all">
                            <img
                              src={`${IMAGE_BASE_URL}/w342${rec.poster_path}`}
                              alt={recTitle}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <p className="text-xs font-bold text-white truncate mt-1.5">
                            {recTitle}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {safeGetYear(rec.release_date || rec.first_air_date)}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
        </div>

        {/* RIGHT SIDEBAR: Framed Poster + Metadata Card + Links (Matches Screenshot 2) */}
        <aside className="space-y-4">
          {posterUrl && (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d11] shadow-2xl">
              <img
                src={posterUrl}
                alt={title}
                className="w-full aspect-[2/3] object-cover"
              />
            </div>
          )}

          {/* SkyStream Info Table Card */}
          <div className="rounded-2xl bg-[#0d0d11] border border-white/10 p-4 divide-y divide-white/5 text-xs">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-zinc-400">Audio</span>
              <span className="font-bold text-white text-right">
                {isNoVF ? "VOSTFR" : "fr, Français (VF & VO)"}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-zinc-400">Titre original</span>
              <span className="font-bold text-white text-right truncate max-w-[170px]">
                {originalTitle}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-zinc-400">Sortie</span>
              <span className="font-bold text-white text-right">
                {releaseDateStr || "—"}
              </span>
            </div>
            {isTV ? (
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-zinc-400">Saisons</span>
                <span className="font-bold text-white text-right">
                  {seasonsCount || "1"}
                </span>
              </div>
            ) : (
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-zinc-400">Durée</span>
                <span className="font-bold text-white text-right">
                  {details?.runtime
                    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
                    : "—"}
                </span>
              </div>
            )}
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-zinc-400">Qualité</span>
              <span className="font-bold text-white text-right">1080p FHD</span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-zinc-400">Note TMDB</span>
              <span className="font-bold text-white text-right">
                {rating ? `${rating} / 10` : "—"}
              </span>
            </div>
          </div>

          {/* External Action Buttons */}
          <div className="space-y-2">
            <a
              href={`https://www.themoviedb.org/${mediaType}/${details?.id || activeMedia.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0d0d11] hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span>Voir sur TMDB</span>
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(title + " streaming")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0d0d11] hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>Rechercher sur Google</span>
            </a>
          </div>
        </aside>
      </div>

      {/* TRAILER MODAL */}
      {showTrailerModal && trailer && (
        <div
          onClick={() => setShowTrailerModal(false)}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl"
          >
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/75 hover:bg-black text-white border border-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1`}
              title="Bande-annonce"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* ACTOR FILMOGRAPHY MODAL */}
      {selectedActor && (
        <div
          onClick={() => setSelectedActor(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0d0d11] border border-white/10 rounded-2xl shadow-2xl p-5"
          >
            <button
              onClick={() => setSelectedActor(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-4 mb-5">
              {selectedActor.profile_path ? (
                <img
                  src={`${IMAGE_BASE_URL}/w185${selectedActor.profile_path}`}
                  alt={selectedActor.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-orange-500"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Users className="w-7 h-7 text-zinc-500" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-black text-white">{selectedActor.name}</h3>
                <p className="text-xs text-zinc-400">
                  {selectedActor.character && `Rôle : ${selectedActor.character}`}
                </p>
              </div>
            </div>
            {actorLoading ? (
              <div className="py-12 flex items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                <span className="text-sm">Chargement de la filmographie...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {actorCredits.slice(0, 25).map((credit) => (
                  <div
                    key={`${credit.id}-${credit.media_type}`}
                    onClick={() => {
                      setSelectedActor(null);
                      setActiveMedia({ ...credit, title: credit.title || credit.name });
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 border border-white/5 group-hover:border-orange-500/60 group-hover:scale-105 transition-all">
                      <img
                        src={`${IMAGE_BASE_URL}/w300${credit.poster_path}`}
                        alt={credit.title || credit.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-white truncate mt-1">
                      {credit.title || credit.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

