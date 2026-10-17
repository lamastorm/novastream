import React from "react";
import { Play, Plus, Check } from "lucide-react";
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

  const isKnownTV =
    item.id === 1399 ||
    item.id === 94997 ||
    (item.title && item.title.toLowerCase().includes("game of thrones")) ||
    (item.name && item.name.toLowerCase().includes("game of thrones"));

  const isExplicitMovie =
    !isKnownTV &&
    (item.media_type === "movie" ||
      Boolean(
        item.release_date &&
          !item.first_air_date &&
          !item.number_of_seasons &&
          !item.seasons?.length &&
          !item.season &&
          !item.episode
      ));

  const isSeries =
    isKnownTV ||
    (!isExplicitMovie &&
      (item.media_type === "tv" ||
        Boolean(item.first_air_date && !item.release_date) ||
        Boolean(item.number_of_seasons) ||
        Boolean(item.seasons?.length) ||
        Boolean(item.name && !item.title) ||
        Number(item.season) > 1 ||
        Number(item.episode) > 1 ||
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

  const mediaTypeLabel = isAnime ? "Anime" : isSeries ? "Série" : "Film";
  const seasonNum = Number(item.season) || 1;
  const episodeNum = Number(item.episode) || 1;

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
      className="group relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-orange-500/50 cursor-pointer transition-all duration-300 hover:scale-[1.035] hover:shadow-[0_10px_28px_rgba(139,92,246,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 flex-shrink-0 shadow-lg select-none"
    >
      {/* Full-bleed Poster */}
      <img
        src={posterUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Permanent Resume Pill for History Items */}
      {hasProgress && (
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/90 backdrop-blur-md border border-orange-500/45 shadow-lg text-white group-hover:opacity-0 transition-opacity duration-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-bold text-white truncate">
              {isSeries ? `S${seasonNum}E${episodeNum}` : "En cours"}
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-erodium-gradient text-white flex items-center gap-1 flex-shrink-0">
            <Play className="w-2.5 h-2.5 fill-white" />
            Reprendre
          </span>
        </div>
      )}

      {/* Hover / Focus Overlay (SkyStream sleek dark gradient with Orange/Violet accents) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
        {/* Top Row: Category Badge & Watchlist + Button */}
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-erodium-gradient text-white shadow">
            {mediaTypeLabel}
          </span>

          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item);
              }}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isFavorite ? (
                <Check className="w-3.5 h-3.5 text-orange-400" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          )}
        </div>

        {/* Center Play Circle */}
        <div className="self-center w-11 h-11 rounded-full bg-erodium-gradient glow-erodium text-white flex items-center justify-center transform scale-90 group-hover:scale-105 transition-transform duration-300">
          <Play className="w-5 h-5 fill-white ml-0.5" />
        </div>

        {/* Bottom Info */}
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-snug drop-shadow group-hover:text-orange-300 transition-colors">
            {title}
          </h4>
          <p className="text-[11px] font-medium text-zinc-300 mt-0.5">
            {[
              hasProgress && isSeries ? `S${seasonNum}E${episodeNum}` : year,
              rating ? `★ ${rating}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MediaCard);

