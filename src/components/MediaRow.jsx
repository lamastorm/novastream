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

  // Strip leading emoji from title for clean SkyStream typography
  const cleanTitle = typeof title === "string" ? title.replace(/^[\p{Emoji}\u200d\s]+/gu, "").trim() || title : title;

  if (!items || items.length === 0) return null;

  return (
    <section className="media-row-container mb-10 relative group/row select-none">
      {/* Titre de section sobre et lisible */}
      <div className="flex items-end justify-between mb-3 px-1">
        <div className="flex items-stretch gap-2.5">
          <span className="w-1 rounded-full bg-orange-500 flex-shrink-0 my-0.5" />
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              {cleanTitle}
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => scroll("right")}
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
        >
          Tout voir →
        </button>
      </div>

      {/* Cards Scroller with Floating Circular Side Arrows */}
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          aria-label="Précédent"
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-950/85 hover:bg-black text-white border border-white/15 items-center justify-center shadow-xl opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => scroll("right")}
          aria-label="Suivant"
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-950/85 hover:bg-black text-white border border-white/15 items-center justify-center shadow-xl opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
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
                Boolean(
                  item.release_date &&
                    !item.first_air_date &&
                    !item.number_of_seasons &&
                    !item.seasons?.length &&
                    !item.season &&
                    !item.episode
                ));

            const isItemTV =
              isKnownTV ||
              (!isItemMovie &&
                (item.media_type === "tv" ||
                  Boolean(item.first_air_date && !item.release_date) ||
                  Boolean(item.name && !item.title) ||
                  Boolean(item.number_of_seasons) ||
                  Boolean(item.seasons?.length) ||
                  Number(item.season) > 1 ||
                  Number(item.episode) > 1 ||
                  item.source === "anime-sama" ||
                  item.source === "anilist" ||
                  item.source === "mal" ||
                  String(item.id).startsWith("as_")));
            const type = isItemMovie ? "movie" : isItemTV ? "tv" : item.media_type || "movie";
            const isFav = favorites.some((f) => f && f.id === item.id && f.media_type === type);

            return (
              <div
                key={`${item.id}-${type}-${idx}`}
                className="w-[140px] sm:w-[165px] md:w-[180px] flex-shrink-0 snap-start"
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
      </div>
    </section>
  );
}

export default React.memo(MediaRow);

