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
      onClick={() => onSelect(item)}
      className="group relative flex flex-col rounded-xl overflow-hidden glass-card cursor-pointer transition-transform duration-200 hover:scale-[1.03] flex-shrink-0"
    >
      {/* Poster image container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
        <img
          src={posterUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
          {/* Top Actions */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isAnime
                    ? "bg-pink-600/90 text-white"
                    : mediaTypeLabel === "Film"
                    ? "bg-indigo-600/90 text-white"
                    : "bg-emerald-600/90 text-white"
                }`}
              >
                {mediaTypeLabel}
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
              className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/10 transition-colors"
            >
              {isFavorite ? (
                <BookmarkCheck className="w-4 h-4 text-indigo-400" />
              ) : (
                <Bookmark className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* Centered Play Button */}
          <div className="self-center w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/50 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-200">
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
      </div>

      {/* Info footer */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-1">
        <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-indigo-400 transition-colors">
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
