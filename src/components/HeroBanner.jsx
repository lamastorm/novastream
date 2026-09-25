import React from "react";
import { Play, Info, Bookmark, BookmarkCheck, Star, Calendar } from "lucide-react";
import { IMAGE_BASE_URL } from "../api/tmdb";

export default function HeroBanner({
  item,
  onPlay,
  onMoreInfo,
  isFavorite,
  onToggleFavorite,
}) {
  if (!item) return null;

  const title = item.title || item.name || "";
  const overview = item.overview || "Découvrez ce titre incontournable sur Erodium.";
  const date = String(item.release_date || item.first_air_date || "");
  const year = date ? (isNaN(new Date(date).getFullYear()) ? "" : String(new Date(date).getFullYear())) : "";
  const voteNum = Number(item.vote_average);
  const rating = !isNaN(voteNum) && voteNum > 0 ? voteNum.toFixed(1) : null;
  const backdropUrl = item.backdrop_path
    ? `${IMAGE_BASE_URL}/original${item.backdrop_path}`
    : null;

  const isAnime =
    item.original_language === "ja" &&
    (item.genre_ids?.includes(16) || item.genres?.some((g) => g.id === 16));

  return (
    <div className="relative w-full h-[65vh] min-h-[480px] max-h-[700px] mb-8 rounded-2xl overflow-hidden glass shadow-2xl border border-white/5">
      {/* Background Backdrop Image */}
      {backdropUrl ? (
        <img
          src={backdropUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-75 scale-105 transform animate-fade-in"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-950/60 via-zinc-950 to-black" />
      )}

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      {/* Hero Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-12 sm:pb-16 max-w-2xl">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-xs uppercase px-3 py-1 rounded-lg tracking-wider shadow-lg shadow-orange-600/30 border border-orange-400/30">
            À la une
          </span>
          {isAnime && (
            <span className="bg-red-600/90 text-white font-bold text-xs uppercase px-2.5 py-1 rounded-lg tracking-wider shadow border border-red-500/30">
              Anime
            </span>
          )}
          {rating && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
            </div>
          )}
          {year && (
            <div className="flex items-center gap-1 text-zinc-300 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{year}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-3 drop-shadow-md">
          {title}
        </h1>

        {/* Synopsis */}
        <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 mb-6 max-w-xl leading-relaxed text-shadow">
          {overview}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-orange-600/30 hover:scale-[1.03] transition-all cursor-pointer border border-orange-400/40"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Regarder maintenant</span>
          </button>

          <button
            onClick={() => onMoreInfo(item)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/15 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span>Détails & Saisons</span>
          </button>

          <button
            onClick={() => onToggleFavorite(item)}
            className="p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? (
              <BookmarkCheck className="w-5 h-5 text-orange-400" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
