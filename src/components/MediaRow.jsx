import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";

function MediaRow({
  title,
  subtitle,
  items = [],
  onSelect,
  favorites = [],
  onToggleFavorite,
  badge,
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="media-row-container mb-10 relative group/row">
      {/* Row Header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
            {badge && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Nav Buttons */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll("left")}
            aria-label="Faire défiler vers la gauche"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Faire défiler vers la droite"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Scroller */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.filter(Boolean).map((item, idx) => {
          const isKnownTV =
            item.id === 1399 ||
            item.id === 94997 ||
            (item.title && item.title.toLowerCase().includes("game of thrones")) ||
            (item.name && item.name.toLowerCase().includes("game of thrones"));

          const isItemMovie =
            !isKnownTV &&
            (item.media_type === "movie" ||
              Boolean(item.release_date && !item.first_air_date && !item.number_of_seasons && !item.seasons?.length && !item.season && !item.episode));

          const isItemTV =
            isKnownTV ||
            (!isItemMovie &&
              (item.media_type === "tv" ||
                Boolean(item.first_air_date && !item.release_date) ||
                Boolean(item.name && !item.title) ||
                Boolean(item.number_of_seasons) ||
                Boolean(item.seasons?.length) ||
                (Number(item.season) > 1 || Number(item.episode) > 1) ||
                item.source === "anime-sama" ||
                item.source === "anilist" ||
                item.source === "mal" ||
                String(item.id).startsWith("as_")));
          const type = isItemMovie ? "movie" : (isItemTV ? "tv" : (item.media_type || "movie"));
          const isFav = favorites.some((f) => f && f.id === item.id && f.media_type === type);

          return (
            <div
              key={`${item.id}-${type}-${idx}`}
              className="w-[160px] sm:w-[190px] md:w-[210px] flex-shrink-0 snap-start"
            >
              <MediaCard
                item={{ ...item, media_type: type }}
                onSelect={onSelect}
                isFavorite={isFav}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default React.memo(MediaRow);
