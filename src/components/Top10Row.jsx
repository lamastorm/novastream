import React from "react";
import { Plus, Check } from "lucide-react";
import { IMAGE_BASE_URL } from "../api/tmdb";

function Top10Row({
  title = "Top 10 de la semaine",
  subtitle = "Les films et séries les plus regardés sur Erodium",
  items = [],
  onSelect,
  favorites = [],
  onToggleFavorite,
}) {
  const top10 = (items || []).filter(Boolean).slice(0, 10);
  if (top10.length === 0) return null;

  const top3 = top10.slice(0, 3);
  const next7 = top10.slice(3, 10);

  const getYear = (item) => {
    const d = String(item.release_date || item.first_air_date || "");
    return d ? d.slice(0, 4) : "";
  };

  const getRating = (item) => {
    const v = Number(item.vote_average);
    return !isNaN(v) && v > 0 ? v.toFixed(1) : null;
  };

  return (
    <section className="mb-12 select-none">
      {/* Section Header */}
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Top 3 Large Landscape Cards (#1, #2, #3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {top3.map((item, idx) => {
          const rank = idx + 1;
          const mediaTitle = item.title || item.name || "Titre";
          const type = item.media_type || (item.title && !item.first_air_date ? "movie" : "tv");
          const isFav = favorites.some((f) => f && f.id === item.id && f.media_type === type);
          const bgUrl = item.backdrop_path
            ? `${IMAGE_BASE_URL}/w780${item.backdrop_path}`
            : item.poster_path
            ? `${IMAGE_BASE_URL}/w500${item.poster_path}`
            : null;
          const year = getYear(item);
          const rating = getRating(item);

          return (
            <div
              key={`${item.id}-${rank}`}
              onClick={() => onSelect({ ...item, media_type: type })}
              className="group relative aspect-[16/9] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-300 hover:scale-[1.015] shadow-xl"
            >
              {bgUrl && (
                <img
                  src={bgUrl}
                  alt={mediaTitle}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}

              {/* Dark bottom vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

              {/* Top-left SkyStream 3D Rank Number (1, 2, 3) */}
              <div className="absolute top-3 left-4 z-10 pointer-events-none">
                <span
                  className="text-5xl sm:text-6xl font-black leading-none tracking-tighter select-none"
                  style={{
                    color: "#09090b",
                    WebkitTextStroke: "1.5px rgba(255,255,255,0.85)",
                    filter: "drop-shadow(3px 3px 0px #e50914)",
                  }}
                >
                  {rank}
                </span>
              </div>

              {/* Top-right Watchlist + Button */}
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite({ ...item, media_type: type });
                  }}
                  title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                  className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  {isFav ? <Check className="w-3.5 h-3.5 text-[#e50914]" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Bottom-left Title & Metadata */}
              <div className="absolute bottom-3.5 left-4 right-4 z-10">
                <h4 className="text-base sm:text-lg font-extrabold text-white line-clamp-1 drop-shadow">
                  {mediaTitle}
                </h4>
                <p className="text-[11px] font-medium text-zinc-300 mt-0.5">
                  {[year, rating ? `★ ${rating}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks #4 to #10 Vertical Poster Cards */}
      {next7.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
          {next7.map((item, idx) => {
            const rank = idx + 4;
            const mediaTitle = item.title || item.name || "Titre";
            const type = item.media_type || (item.title && !item.first_air_date ? "movie" : "tv");
            const posterUrl = item.poster_path
              ? `${IMAGE_BASE_URL}/w342${item.poster_path}`
              : item.backdrop_path
              ? `${IMAGE_BASE_URL}/w500${item.backdrop_path}`
              : null;
            const year = getYear(item);
            const rating = getRating(item);

            return (
              <div
                key={`${item.id}-${rank}`}
                onClick={() => onSelect({ ...item, media_type: type })}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-lg"
              >
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt={mediaTitle}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Bottom dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                {/* Bottom-left Title + Meta */}
                <div className="absolute bottom-2.5 left-2.5 right-12 z-10">
                  <h5 className="text-xs font-extrabold text-white line-clamp-1 drop-shadow">
                    {mediaTitle}
                  </h5>
                  <p className="text-[10px] text-zinc-300 mt-0.5">
                    {[year, rating ? `★ ${rating}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>

                {/* Bottom-right SkyStream 3D Rank Number (4..10) */}
                <div className="absolute bottom-1 right-2 z-10 pointer-events-none">
                  <span
                    className="text-4xl sm:text-5xl font-black leading-none tracking-tighter select-none"
                    style={{
                      color: "#09090b",
                      WebkitTextStroke: "1.5px rgba(255,255,255,0.85)",
                      filter: "drop-shadow(2.5px 2.5px 0px #e50914)",
                    }}
                  >
                    {rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default React.memo(Top10Row);

