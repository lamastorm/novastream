import React from "react";
import { Star, Play, Bookmark, BookmarkCheck } from "lucide-react";
import { IMAGE_BASE_URL } from "../api/tmdb";

function MediaCard({
  item,
  onSelect,
  isFavorite,
  onToggleFavorite,
}) {
  if (!item) return null;

  const title = item.title || item.name || "Titre inconnu";
  const date = String(item.release_date || item.first_air_date || "");
  const year = date ? (isNaN(new Date(date).getFullYear()) ? "" : String(new Date(date).getFullYear())) : "";
  const voteNum = Number(item.vote_average);
  const rating = !isNaN(voteNum) && voteNum > 0 ? voteNum.toFixed(1) : null;
  const posterUrl =
    item.customPoster ||
    (item.poster_path
      ? `${IMAGE_BASE_URL}/w342${item.poster_path}`
      : "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&auto=format&fit=crop&q=80");

  // Determine media type
  const isKnownTV =
    item.id === 1399 ||
    item.id === 94997 ||
    (item.title && item.title.toLowerCase().includes("game of thrones")) ||
    (item.name && item.name.toLowerCase().includes("game of thrones"));

  const isExplicitMovie =
    !isKnownTV &&
    (item.media_type === "movie" ||
      Boolean(item.release_date && !item.first_air_date && !item.number_of_seasons && !item.seasons?.length && !item.season && !item.episode));

  const isSeries =
    isKnownTV ||
    (!isExplicitMovie &&
      (item.media_type === "tv" ||
        Boolean(item.first_air_date && !item.release_date) ||
        Boolean(item.number_of_seasons) ||
        Boolean(item.seasons?.length) ||
        Boolean(item.name && !item.title) ||
        (Number(item.season) > 1 || Number(item.episode) > 1) ||
        item.source === "anime-sama" ||
        item.source === "anilist" ||
        item.source === "mal" ||
        String(item.id).startsWith("as_")));

  const hasProgress = Boolean(
    (isSeries && item.season !== undefined && item.episode !== undefined) ||
    item.watchedAt ||
    item.lastSeason ||
    item.lastEpisode ||
    item.progress !== undefined
  );

  const isAnime =
    item.original_language === "ja" &&
    (item.genre_ids?.includes(16) || item.genres?.some((g) => g.id === 16));

  const mediaTypeLabel = isAnime
    ? "Anime"
    : isSeries
    ? "Série"
    : "Film";

  const seasonNum = Number(item.season) || 1;
  const episodeNum = Number(item.episode) || 1;

  const isUpcoming =
    (item.status === "In Production" || item.status === "Planned") ||
    (date && new Date(date) > new Date() && (item.vote_count === 0 || !item.vote_count));

  return (
    <div
      tabIndex={0}
      role="button"
      data-focusable="true"
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className="group relative flex flex-col rounded-xl overflow-hidden glass-card cursor-pointer transition-all duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500 focus-visible:scale-[1.06] focus-visible:shadow-[0_0_30px_rgba(249,115,22,0.8)] focus-visible:z-20 flex-shrink-0 active:scale-95"
    >
      {/* Poster image container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
        <img
          src={posterUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
        />

        {/* Permanent Resume Banner for History / In-Progress Items (Visible before hover) */}
        {hasProgress && (
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/90 backdrop-blur-md border border-orange-500/50 shadow-lg text-white group-hover:opacity-0 transition-opacity duration-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-bold text-orange-400 truncate">
                {isSeries ? `S${seasonNum} : EP ${episodeNum}` : "Film"}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center gap-1 flex-shrink-0 shadow-sm">
              <Play className="w-2.5 h-2.5 fill-white" />
              Reprendre
            </span>
          </div>
        )}

        {/* Gradient Overlay on Hover & Focus (Visible on TV controller focus too) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 pointer-events-none group-hover:pointer-events-auto group-focus-visible:pointer-events-auto">
          {/* Top Actions */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isAnime
                    ? "bg-red-600/90 text-white"
                    : isSeries
                    ? "bg-emerald-600/90 text-white"
                    : "bg-gradient-to-r from-orange-600 to-amber-600 text-white"
                }`}
              >
                {mediaTypeLabel}
              </span>
              {hasProgress && isSeries && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  S{seasonNum}:EP{episodeNum}
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⚡ 0 Pub
              </span>
              {isUpcoming && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                  ⏳ Bientôt
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item);
              }}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/10 transition-colors cursor-pointer"
            >
              {isFavorite ? (
                <BookmarkCheck className="w-4 h-4 text-orange-400" />
              ) : (
                <Bookmark className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* Centered Resume / Play Button */}
          <div className="self-center flex flex-col items-center gap-1.5 transform translate-y-3 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-200">
            <div className="px-3.5 py-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center gap-2 shadow-xl shadow-orange-600/50 hover:scale-105 active:scale-95 transition-all">
              <Play className="w-4 h-4 fill-white flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                {hasProgress
                  ? (isSeries ? `Reprendre S${seasonNum}:EP${episodeNum}` : "Reprendre le film")
                  : (isSeries ? "Lancer la série" : "Regarder le film")}
              </span>
            </div>
          </div>

          {/* Bottom overview snippet */}
          <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
            {hasProgress && isSeries
              ? `Reprendre directement la Saison ${seasonNum}, Épisode ${episodeNum}.`
              : item.overview || "Cliquez pour voir les détails et lancer la lecture."}
          </p>
        </div>

        {/* Floating Rating Badge */}
        {rating && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md border border-white/10 group-hover:opacity-0 transition-opacity duration-200">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
          </div>
        )}

        {/* Floating 0 Pub Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-950/85 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 group-hover:opacity-0 transition-opacity duration-200">
          <span>⚡ 0 Pub</span>
        </div>
      </div>

      {/* Info footer */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-1">
        <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-orange-400 group-focus-visible:text-orange-400 transition-colors">
          {title}
        </h4>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{year || "—"}</span>
          <span className="text-[11px] font-medium flex items-center gap-1">
            {hasProgress && isSeries ? (
              <span className="text-orange-400 font-bold">
                S{seasonNum} • EP {episodeNum}
              </span>
            ) : (
              <span className="text-zinc-500">{mediaTypeLabel}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MediaCard);
