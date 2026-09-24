import React from "react";
import { Star, Play, Bookmark, BookmarkCheck } from "lucide-react";
import { IMAGE_BASE_URL } from "../api/tmdb";

function MediaCard({
  item,
  onSelect,
  isFavorite,
  onToggleFavorite,
}) {
  const title = item.title || item.name || "Titre inconnu";
  const date = item.release_date || item.first_air_date || "";
  const year = date ? new Date(date).getFullYear() : "";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const posterUrl =
    item.customPoster ||
    (item.poster_path
      ? `${IMAGE_BASE_URL}/w342${item.poster_path}`
      : "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&auto=format&fit=crop&q=80");

  // Determine media type
  const isAnime =
    item.original_language === "ja" &&
    (item.genre_ids?.includes(16) || item.genres?.some((g) => g.id === 16));
  const mediaTypeLabel = isAnime
    ? "Anime"
    : item.media_type === "movie" || item.title
    ? "Film"
    : "Série";

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

        {/* Gradient Overlay on Hover & Focus (Visible on TV controller focus too) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 pointer-events-none group-hover:pointer-events-auto group-focus-visible:pointer-events-auto">
          {/* Top Actions */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isAnime
                    ? "bg-red-600/90 text-white"
                    : mediaTypeLabel === "Film"
                    ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white"
                    : "bg-emerald-600/90 text-white"
                }`}
              >
                {mediaTypeLabel}
              </span>
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

          {/* Centered Play Button */}
          <div className="self-center w-12 h-12 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/50 transform translate-y-4 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-200">
            <Play className="w-5 h-5 ml-0.5 fill-white" />
          </div>

          {/* Bottom overview snippet */}
          <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
            {item.overview || "Cliquez pour voir les détails et lancer la lecture."}
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
          <span className="text-[11px] text-zinc-500 font-medium">
            {mediaTypeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MediaCard);
