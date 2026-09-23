import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Bookmark, BookmarkCheck } from "lucide-react";
import { IMAGE_BASE_URL } from "../api/tmdb";

function Top10Row({
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

  const top10 = (items || []).slice(0, 10);
  if (top10.length === 0) return null;

  return (
    <section className="media-row-container mb-12 relative group/top10">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="text-xl font-black text-white tracking-wide uppercase">
              {title}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              TOP 10 AUJOURD'HUI
            </span>
          </div>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Nav */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/top10:opacity-100 transition-opacity">
          <button
            onClick={() => scroll("left")}
            aria-label="Précédent"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Suivant"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 10 Scroller */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-6 overflow-x-auto pb-4 pt-2 px-2 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {top10.map((item, index) => {
          const rank = index + 1;
          const mediaTitle = item.title || item.name;
          const type = item.media_type || (item.title ? "movie" : "tv");
          const isFav = favorites.some((f) => f.id === item.id && f.media_type === type);
          const posterUrl = item.poster_path
            ? `${IMAGE_BASE_URL}/w342${item.poster_path}`
            : null;

          return (
            <div
              key={`${item.id}-${rank}`}
              onClick={() => onSelect({ ...item, media_type: type })}
              className="relative flex items-end flex-shrink-0 group cursor-pointer snap-start"
            >
              {/* Giant Rank Number (Netflix style outline & gradient) */}
              <div className="relative -mr-5 sm:-mr-8 z-0 select-none pointer-events-none">
                <span
                  className="text-7xl sm:text-8xl md:text-9xl font-black italic tracking-tighter"
                  style={{
                    WebkitTextStroke: "2px rgba(255, 255, 255, 0.25)",
                    color: "#0e1017",
                    textShadow: "0 0 20px rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {rank}
                </span>
              </div>

              {/* Poster Card */}
              <div className="relative z-10 w-[130px] sm:w-[155px] md:w-[175px] aspect-[2/3] rounded-xl overflow-hidden glass-card transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-indigo-500/20">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={mediaTitle}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-2 text-center text-xs">
                    {mediaTitle}
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite({ ...item, media_type: type });
                      }}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90"
                    >
                      {isFav ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40">
                      <Play className="w-4 h-4 ml-0.5 fill-white" />
                    </div>
                    <span className="text-[11px] font-bold text-white text-center line-clamp-1">
                      {mediaTitle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default React.memo(Top10Row);
