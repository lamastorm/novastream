import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Star,
  Calendar,
  Clock,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Tv,
  Film,
  Users,
  AlertCircle,
  Sparkles,
  Layers,
  Globe,
  Loader2,
} from "lucide-react";
import { tmdbApi, IMAGE_BASE_URL } from "../api/tmdb";
import { languageAdvisor } from "../services/languageAdvisor";
import { useMediaLiveViewers } from "../services/liveCounter";

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
  const [watchProviders, setWatchProviders] = useState([]);
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorCredits, setActorCredits] = useState([]);
  const [actorLoading, setActorLoading] = useState(false);

  // Reset activeMedia if prop changes
  useEffect(() => {
    setActiveMedia(initialMedia);
  }, [initialMedia]);

  const mediaType = activeMedia.media_type || (activeMedia.title ? "movie" : "tv");
  const isTV = mediaType === "tv";

  // Fetch full details & JustWatch availability (with auto-resolve for AniList/MAL/TVmaze)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setCollectionData(null);

    const loadData = async () => {
      let targetId = activeMedia.id;
      let targetType = mediaType;

      // Auto-resolve title to TMDB ID if source is external (AniList, MAL, TVmaze)
      if (activeMedia.source === "mal" || activeMedia.source === "anilist" || activeMedia.source === "tvmaze") {
        try {
          const titleToSearch = activeMedia.title || activeMedia.name;
          const searchRes = await tmdbApi.searchMulti(titleToSearch);
          const match = searchRes.results?.find(
            (r) => (r.media_type === "tv" || r.media_type === "movie") && (r.poster_path || r.backdrop_path)
          ) || searchRes.results?.[0];

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

        // Fetch collection / franchise parts if available (Annabelle, Harry Potter, etc.)
        if (data.belongs_to_collection?.id) {
          tmdbApi.getCollection(data.belongs_to_collection.id).then((col) => {
            if (isMounted && col) setCollectionData(col);
          }).catch(() => {});
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

      // Fetch JustWatch availability in France
      try {
        const providers = await tmdbApi.getWatchProviders(targetType, targetId);
        if (isMounted) setWatchProviders(providers);
      } catch {}
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeMedia.id, mediaType, activeMedia.source]);

  // Fetch episodes when selected season changes
  useEffect(() => {
    if (!isTV || !details) return;

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
  }, [activeMedia.id, selectedSeason, isTV, details]);

  if (!activeMedia) return null;

  const isUnreleasedSeries =
    isTV &&
    (details?.status === "In Production" ||
      details?.status === "Planned" ||
      (details?.first_air_date && new Date(details.first_air_date) > new Date()) ||
      (!loading && episodes.length === 0 && !loadingEpisodes));

  const currentMediaTarget = details || activeMedia;
  const isNoVF = languageAdvisor.hasNoOfficialVF(currentMediaTarget);
  const langAdvice = languageAdvisor.getExplanation(currentMediaTarget);
  const liveWatchers = useMediaLiveViewers(
    currentMediaTarget.id,
    details?.popularity || activeMedia.popularity
  );

  const title = details?.title || details?.name || activeMedia.title || activeMedia.name;
  const originalTitle = details?.original_title || details?.original_name;
  const backdropUrl = (details?.backdrop_path || activeMedia.backdrop_path)
    ? `${IMAGE_BASE_URL}/original${details?.backdrop_path || activeMedia.backdrop_path}`
    : null;
  const posterUrl = (details?.poster_path || activeMedia.poster_path)
    ? `${IMAGE_BASE_URL}/w500${details?.poster_path || activeMedia.poster_path}`
    : null;

  const trailer = details?.videos?.results?.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto glass rounded-2xl border border-white/10 shadow-2xl z-10 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white transition-colors border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Backdrop */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden flex-shrink-0">
          {backdropUrl && (
            <img
              src={backdropUrl}
              alt={title}
              className="w-full h-full object-cover filter brightness-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12141d] via-[#12141d]/50 to-transparent" />

          {/* Quick Details overlay */}
          <div className="absolute bottom-4 left-4 sm:left-8 right-8 flex items-end gap-5">
            {posterUrl && (
              <img
                src={posterUrl}
                alt={title}
                className="hidden sm:block w-32 aspect-[2/3] object-cover rounded-xl shadow-2xl border-2 border-white/10"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
                  {isTV ? "Série / Anime" : "Film"}
                </span>
                {isUnreleasedSeries && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-black uppercase tracking-wider">
                    ⏳ Non encore diffusé
                  </span>
                )}
                {langAdvice?.badge && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isNoVF
                      ? "bg-indigo-500/25 text-indigo-300 border-indigo-500/40"
                      : "bg-zinc-800 text-zinc-300 border-white/10"
                  }`}>
                    {langAdvice.badge}
                  </span>
                )}
                {/* Live Spectateurs Badge (100% réel) */}
                {liveWatchers > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>
                      {liveWatchers} {liveWatchers > 1 ? "regardent" : "regarde"} en direct
                    </span>
                  </div>
                )}
                {details?.vote_average && (
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{details.vote_average.toFixed(1)}</span>
                  </div>
                )}
                {(details?.release_date || details?.first_air_date) && (
                  <span className="text-xs text-zinc-300">
                    {new Date(details.release_date || details.first_air_date).getFullYear()}
                  </span>
                )}
                {details?.runtime && (
                  <span className="text-xs text-zinc-300">
                    {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {title}
              </h2>
              {originalTitle && originalTitle !== title && (
                <p className="text-xs text-zinc-400 italic">{originalTitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          {/* Main Action Bar */}
          {isUnreleasedSeries ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Cette série TV est actuellement en production / non sortie</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                La diffusion de cette série n'a pas encore commencé. Aucun épisode n'est pour l'instant disponible au visionnage.
              </p>
              {title.toLowerCase().includes("harry potter") && (
                <button
                  onClick={() => {
                    setActiveMedia({
                      id: 671,
                      media_type: "movie",
                      title: "Harry Potter à l'école des sorciers",
                    });
                  }}
                  className="mt-2 self-start flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>👉 Lancer plutôt le film culte « Harry Potter à l'école des sorciers » (2001)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4 border-b border-white/5">
              {/* Notice d'adaptation linguistique si pas de VF */}
              {isNoVF && (
                <div className="p-3.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs flex items-center justify-between gap-3 shadow-lg shadow-indigo-950/50">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 animate-pulse" />
                    <div>
                      <span className="font-bold text-white">Adaptation automatique : </span>
                      <span>
                        {langAdvice?.message ||
                          "Cette production n'a pas de doublage VF officiel. La lecture en VOSTFR Full HD est sélectionnée par défaut pour garantir la lecture sans erreur 404."}
                      </span>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-indigo-500/30 text-indigo-300 font-bold text-[11px] whitespace-nowrap border border-indigo-500/30">
                    VOSTFR 1080p
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* Bouton VISIONNER EN VF 🇫🇷 */}
                <button
                  onClick={() => {
                    setSelectedLang("vf");
                    const targetMedia = {
                      ...activeMedia,
                      ...details,
                      id: details?.id || activeMedia.id,
                      media_type: isTV ? "tv" : "movie",
                      title: details?.name || details?.title || activeMedia.title,
                      original_language: details?.original_language || activeMedia.original_language,
                    };
                    onPlay(targetMedia, isTV ? selectedSeason : 1, 1, "vf");
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0d111a] hover:bg-orange-600/20 text-white font-extrabold text-xs uppercase tracking-wider border border-orange-500/50 hover:border-orange-500 shadow-lg shadow-orange-500/15 hover:shadow-orange-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                  <span>VISIONNER EN VF 🇫🇷</span>
                </button>

                {/* Bouton VISIONNER EN VOSTFR 🇯🇵 */}
                <button
                  onClick={() => {
                    setSelectedLang("vostfr");
                    const targetMedia = {
                      ...activeMedia,
                      ...details,
                      id: details?.id || activeMedia.id,
                      media_type: isTV ? "tv" : "movie",
                      title: details?.name || details?.title || activeMedia.title,
                      original_language: details?.original_language || activeMedia.original_language,
                    };
                    onPlay(targetMedia, isTV ? selectedSeason : 1, 1, "vostfr");
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0d111a] hover:bg-[#151c2e] text-white font-extrabold text-xs uppercase tracking-wider border border-blue-500/40 hover:border-blue-400 transition-all hover:scale-[1.02] cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                  <span>VISIONNER EN VOSTFR 🇯🇵</span>
                </button>

                {/* Bouton VISIONNER EN VKR 🇰🇷 (si coréen) ou MULTI 🌐 */}
                {activeMedia.original_language === "ko" ? (
                  <button
                    onClick={() => {
                      setSelectedLang("vostfr");
                      const targetMedia = {
                        ...activeMedia,
                        ...details,
                        id: details?.id || activeMedia.id,
                        media_type: isTV ? "tv" : "movie",
                        title: details?.name || details?.title || activeMedia.title,
                        original_language: details?.original_language || activeMedia.original_language,
                      };
                      onPlay(targetMedia, isTV ? selectedSeason : 1, 1, "vostfr");
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0d111a] hover:bg-[#151c2e] text-white font-extrabold text-xs uppercase tracking-wider border border-purple-500/40 hover:border-purple-400 transition-all hover:scale-[1.02] cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-purple-400 text-purple-400" />
                    <span>VISIONNER EN VKR 🇰🇷</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedLang("multi");
                      const targetMedia = {
                        ...activeMedia,
                        ...details,
                        id: details?.id || activeMedia.id,
                        media_type: isTV ? "tv" : "movie",
                        title: details?.name || details?.title || activeMedia.title,
                        original_language: details?.original_language || activeMedia.original_language,
                      };
                      onPlay(targetMedia, isTV ? selectedSeason : 1, 1, "multi");
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0d111a] hover:bg-[#151c2e] text-zinc-200 hover:text-white font-extrabold text-xs uppercase tracking-wider border border-zinc-700/60 hover:border-zinc-500 transition-all hover:scale-[1.02] cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-400 text-zinc-400" />
                    <span>VISIONNER EN MULTI 🌐</span>
                  </button>
                )}

                {/* Bouton Favoris */}
                <button
                  onClick={() => onToggleFavorite(activeMedia)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-orange-400 text-xs font-bold border border-white/10 transition-all cursor-pointer ml-auto"
                >
                  {isFavorite ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-orange-400" />
                      <span>Dans vos favoris</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Ajouter aux favoris</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}


          {/* JustWatch Availability in France */}
          {watchProviders && watchProviders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-zinc-900/60 border border-white/5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2">
                🇫🇷 Disponible en streaming sur :
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {watchProviders.slice(0, 5).map((p) => (
                  <div
                    key={p.provider_id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-xs font-semibold text-white shadow-sm"
                  >
                    {p.logo_path && (
                      <img
                        src={`${IMAGE_BASE_URL}/w45${p.logo_path}`}
                        alt={p.provider_name}
                        className="w-4 h-4 rounded object-cover"
                      />
                    )}
                    <span>{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis & Genres */}
          <div>
            <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
              Synopsis
            </h4>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              {details?.overview ||
                activeMedia.overview ||
                "Aucun résumé disponible pour ce titre."}
            </p>

            {/* Genres badges */}
            {details?.genres && details.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {details.genres.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 border border-white/5"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Casting (Acteurs / Voix) */}
          {details?.credits?.cast && details.credits.cast.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Casting / Doubleurs</span>
                <span className="text-[10px] text-zinc-600 normal-case font-normal ml-1">— cliquer pour voir la filmographie</span>
              </h4>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {details.credits.cast.slice(0, 10).map((actor) => (
                  <div
                    key={actor.id}
                    onClick={() => {
                      setSelectedActor(actor);
                      setActorCredits([]);
                      setActorLoading(true);
                      tmdbApi.getPersonCredits(actor.id)
                        .then((credits) => { setActorCredits(credits); setActorLoading(false); })
                        .catch(() => setActorLoading(false));
                    }}
                    className="w-20 flex-shrink-0 text-center flex flex-col items-center cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 mb-1.5 border-2 border-transparent group-hover:border-indigo-500 transition-all">
                      {actor.profile_path ? (
                        <img
                          src={`${IMAGE_BASE_URL}/w185${actor.profile_path}`}
                          alt={actor.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">?</div>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-white line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {actor.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1">{actor.character}</span>
                  </div>
                ))}
              </div>

              {/* Actor Filmography Overlay */}
              {selectedActor && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                  <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-5">
                    <button
                      onClick={() => setSelectedActor(null)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4 mb-5">
                      {selectedActor.profile_path ? (
                        <img
                          src={`${IMAGE_BASE_URL}/w185${selectedActor.profile_path}`}
                          alt={selectedActor.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Users className="w-7 h-7 text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-black text-white">{selectedActor.name}</h3>
                        <p className="text-xs text-zinc-400">{selectedActor.character && `Rôle : ${selectedActor.character}`}</p>
                      </div>
                    </div>
                    {actorLoading ? (
                      <div className="py-12 flex items-center justify-center gap-3 text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-sm">Chargement de la filmographie...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-500 mb-3">{actorCredits.length} titres trouvés</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {actorCredits.slice(0, 25).map((credit) => (
                            <div
                              key={`${credit.id}-${credit.media_type}`}
                              onClick={() => { setSelectedActor(null); setActiveMedia({ ...credit, title: credit.title || credit.name }); }}
                              className="group cursor-pointer"
                            >
                              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 border border-white/5 group-hover:border-indigo-500/50 group-hover:scale-105 transition-all">
                                <img src={`${IMAGE_BASE_URL}/w300${credit.poster_path}`} alt={credit.title || credit.name} className="w-full h-full object-cover" />
                              </div>
                              <p className="text-[10px] font-medium text-white truncate mt-1 group-hover:text-indigo-400 transition-colors">{credit.title || credit.name}</p>
                              <p className="text-[9px] text-zinc-500">{credit.media_type === "movie" ? "Film" : "Série"} • {(credit.release_date || credit.first_air_date || "").slice(0, 4)}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Season & Episode Selector (For TV Series & Animes) */}
          {isTV && details?.seasons && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Épisodes
                  </h4>
                </div>

                {/* Season Dropdown */}
                <div className="relative">
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="appearance-none bg-zinc-800 text-white text-xs font-semibold px-4 py-2 pr-8 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {details.seasons
                      .filter((s) => s.season_number > 0)
                      .map((s) => (
                        <option key={s.id} value={s.season_number}>
                          {s.name} ({s.episode_count} épisodes)
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Episodes List Grid */}
              {loadingEpisodes ? (
                <div className="py-8 text-center text-xs text-zinc-400 animate-pulse">
                  Chargement des épisodes...
                </div>
              ) : episodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => {
                        const targetMedia = {
                          ...activeMedia,
                          ...details,
                          id: details?.id || activeMedia.id,
                          media_type: isTV ? "tv" : "movie",
                          title: details?.name || details?.title || activeMedia.title,
                          original_language: details?.original_language || activeMedia.original_language,
                        };
                        onPlay(
                          targetMedia,
                          selectedSeason,
                          ep.episode_number,
                          isNoVF ? "vostfr" : selectedLang
                        );
                      }}
                      className="group flex gap-3 p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/40 cursor-pointer transition-all"
                    >
                      {/* Episode Thumbnail */}
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                        {ep.still_path ? (
                          <img
                            src={`${IMAGE_BASE_URL}/w300${ep.still_path}`}
                            alt={ep.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                            Ep {ep.episode_number}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <Play className="w-4 h-4 fill-white text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      {/* Episode Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-indigo-400">
                            EP {ep.episode_number}
                          </span>
                          {ep.runtime && (
                            <span className="text-[10px] text-zinc-500">
                              {ep.runtime} min
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                          {ep.name || `Épisode ${ep.episode_number}`}
                        </h5>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {ep.overview || "Visionner cet épisode"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Aucun épisode trouvé pour cette saison.
                </div>
              )}
            </div>
          )}

          {/* SAGA / COLLECTION (Annabelle, Harry Potter, etc.) */}
          {collectionData?.parts && collectionData.parts.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    🎬 Toute la Saga « {collectionData.name} » ({collectionData.parts.length} films)
                  </h4>
                </div>
                <span className="text-[11px] text-zinc-400">Cliquez pour voir un film</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {collectionData.parts
                  .slice()
                  .sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0))
                  .map((part) => {
                    const isCurrent = part.id === details?.id;
                    const partYear = part.release_date ? new Date(part.release_date).getFullYear() : "";
                    const partPoster = part.poster_path
                      ? `${IMAGE_BASE_URL}/w342${part.poster_path}`
                      : null;

                    return (
                      <div
                        key={part.id}
                        onClick={() => {
                          if (!isCurrent) {
                            setActiveMedia({
                              ...part,
                              media_type: "movie",
                              title: part.title,
                            });
                          }
                        }}
                        className={`group relative rounded-xl overflow-hidden glass-card cursor-pointer border transition-all p-2 flex flex-col gap-2 ${
                          isCurrent
                            ? "ring-2 ring-indigo-500 bg-indigo-600/10 border-indigo-500/40"
                            : "border-white/5 hover:border-indigo-500/40 hover:scale-[1.02]"
                        }`}
                      >
                        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-900">
                          {partPoster && (
                            <img
                              src={partPoster}
                              alt={part.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {isCurrent && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-md">
                              Fiche active
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                            {part.title}
                          </h5>
                          <span className="text-[10px] text-zinc-400">{partYear || "—"}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* RECOMMANDATIONS / TITRES SIMILAIRES */}
          {details?.recommendations?.results && details.recommendations.results.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Dans le même univers / Recommandations
                </h4>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {details.recommendations.results
                  .filter((r) => r.poster_path)
                  .slice(0, 10)
                  .map((rec) => {
                    const recTitle = rec.title || rec.name;
                    const recYear = (rec.release_date || rec.first_air_date)
                      ? new Date(rec.release_date || rec.first_air_date).getFullYear()
                      : "";

                    return (
                      <div
                        key={rec.id}
                        onClick={() => {
                          setActiveMedia({
                            ...rec,
                            media_type: rec.media_type || (rec.title ? "movie" : "tv"),
                            title: recTitle,
                          });
                        }}
                        className="w-28 flex-shrink-0 group cursor-pointer"
                      >
                        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-indigo-500/50 group-hover:scale-105 transition-all">
                          <img
                            src={`${IMAGE_BASE_URL}/w300${rec.poster_path}`}
                            alt={recTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h5 className="text-[11px] font-semibold text-white truncate mt-1.5 group-hover:text-indigo-400">
                          {recTitle}
                        </h5>
                        <span className="text-[10px] text-zinc-500">{recYear}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* YouTube Trailer preview if available */}
          {trailer && (
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3">
                Bande-annonce officielle
              </h4>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailer.key}`}
                  title="Trailer"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
