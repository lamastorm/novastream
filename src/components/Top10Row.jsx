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
      {/* Section Header (Image 4 style : Barre verticale néon + Titre en dégradé Orange/Rose/Violet) */}
      <div className="flex items-stretch gap-3 mb-4">
        <span className="erodium-section-bar flex-shrink-0 my-0.5" />
        <div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-erodium-gradient leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs sm:text-[13px] text-purple-200/70 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
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
              className="group relative aspect-[16/9] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-orange-500/50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(139,92,246,0.25)] shadow-xl"
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

              {/* Top-left SkyStream 3D Rank Number (1, 2, 3) with Orange & Violet Neon Drop-Shadow */}
              <div className="absolute top-3 left-4 z-10 pointer-events-none">
                <span
                  className="text-5xl sm:text-6xl font-black leading-none tracking-tighter select-none transition-transform duration-300 group-hover:scale-110 inline-block"
                  style={{
                    color: "#09090b",
                    WebkitTextStroke: "1.5px rgba(255,255,255,0.9)",
                    filter:
                      "drop-shadow(3px 3px 0px #f97316) drop-shadow(-2px -2px 10px rgba(139,92,246,0.75))",
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
                  {isFav ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Bottom-left Title & Metadata */}
              <div className="absolute bottom-3.5 left-4 right-4 z-10">
                <h4 className="text-base sm:text-lg font-extrabold text-white line-clamp-1 drop-shadow group-hover:text-orange-300 transition-colors">
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
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-purple-500/50 cursor-pointer transition-all duration-300 hover:scale-[1.035] hover:shadow-[0_10px_28px_rgba(249,115,22,0.22)] shadow-lg"
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
                  <h5 className="text-xs font-extrabold text-white line-clamp-1 drop-shadow group-hover:text-orange-300 transition-colors">
                    {mediaTitle}
                  </h5>
                  <p className="text-[10px] text-zinc-300 mt-0.5">
                    {[year, rating ? `★ ${rating}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>

                {/* Bottom-right SkyStream 3D Rank Number (4..10) with Orange & Violet Neon Drop-Shadow */}
                <div className="absolute bottom-1 right-2 z-10 pointer-events-none">
                  <span
                    className="text-4xl sm:text-5xl font-black leading-none tracking-tighter select-none transition-transform duration-300 group-hover:scale-110 inline-block"
                    style={{
                      color: "#09090b",
                      WebkitTextStroke: "1.5px rgba(255,255,255,0.9)",
                      filter:
                        "drop-shadow(2.5px 2.5px 0px #f97316) drop-shadow(-2px -2px 8px rgba(139,92,246,0.75))",
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

