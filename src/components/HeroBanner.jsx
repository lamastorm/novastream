import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Info,
  Bookmark,
  BookmarkCheck,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { IMAGE_BASE_URL } from "../api/tmdb";

export default function HeroBanner({
  items = [],
  item,
  onPlay,
  onMoreInfo,
  isItemFavorite,
  isFavorite,
  onToggleFavorite,
}) {
  // Normalize items array
  const slides = (items && items.length > 0 ? items : item ? [item] : []).filter(
    (s) => s && (s.backdrop_path || s.poster_path || s.title || s.name)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  // Auto-advance carousel every 6.5s unless hovered or touching
  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 6500);

    return () => clearInterval(timer);
  }, [slides.length, isPaused, nextSlide]);

  if (slides.length === 0) return null;

  const currentItem = slides[currentIndex] || slides[0];
  const title = currentItem.title || currentItem.name || "";
  const overview =
    currentItem.overview || "Découvrez ce titre incontournable en streaming haute définition sur Erodium.";
  const date = String(currentItem.release_date || currentItem.first_air_date || "");
  const year = date
    ? isNaN(new Date(date).getFullYear())
      ? ""
      : String(new Date(date).getFullYear())
    : "";
  const voteNum = Number(currentItem.vote_average);
  const rating = !isNaN(voteNum) && voteNum > 0 ? voteNum.toFixed(1) : null;

  const isAnime =
    currentItem.original_language === "ja" &&
    (currentItem.genre_ids?.includes(16) || currentItem.genres?.some((g) => g.id === 16));

  const favorite = isItemFavorite
    ? isItemFavorite(currentItem)
    : Boolean(isFavorite);

  // Swipe gesture handling for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  return (
    <div
      className="group relative w-full h-[65vh] min-h-[490px] max-h-[720px] mb-8 rounded-2xl overflow-hidden glass shadow-2xl border border-white/5 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Slides (Stacked with crossfade transition) */}
      {slides.map((s, idx) => {
        const bgUrl = s.backdrop_path
          ? `${IMAGE_BASE_URL}/original${s.backdrop_path}`
          : s.poster_path
          ? `${IMAGE_BASE_URL}/w1280${s.poster_path}`
          : null;

        const isCurrent = idx === currentIndex;

        return (
          <div
            key={s.id || idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isCurrent ? "opacity-100 z-0" : "opacity-0 pointer-events-none -z-10"
            }`}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt={s.title || s.name || "Affiche"}
                className={`w-full h-full object-cover object-center filter brightness-[0.72] scale-105 transform transition-transform duration-10000 ${
                  isCurrent ? "scale-110" : "scale-100"
                }`}
                loading={idx === 0 ? "eager" : "lazy"}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-orange-950/60 via-zinc-950 to-black" />
            )}
          </div>
        );
      })}

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />

      {/* Left / Right Arrow Buttons (Visible on hover or mobile) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Film précédent"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all hover:scale-110 cursor-pointer opacity-70 md:opacity-0 group-hover:opacity-100 shadow-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Film suivant"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all hover:scale-110 cursor-pointer opacity-70 md:opacity-0 group-hover:opacity-100 shadow-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Hero Content (Smooth fade-in on slide change) */}
      <div
        key={currentItem.id || currentIndex}
        className="relative z-20 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-14 sm:pb-16 max-w-2xl animate-fade-in"
      >
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-xs uppercase px-3 py-1 rounded-lg tracking-wider shadow-lg shadow-orange-600/30 border border-orange-400/30">
            🔥 À la une {slides.length > 1 && `• ${currentIndex + 1}/${slides.length}`}
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
            <div className="flex items-center gap-1 text-zinc-300 text-xs font-medium bg-black/40 px-2 py-1 rounded-lg border border-white/5">
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
            onClick={() => onPlay(currentItem)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-orange-600/30 hover:scale-[1.03] transition-all cursor-pointer border border-orange-400/40"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Regarder maintenant</span>
          </button>

          <button
            onClick={() => onMoreInfo(currentItem)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/15 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span>Détails & Saisons</span>
          </button>

          <button
            onClick={() => onToggleFavorite(currentItem)}
            className="p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
            title={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {favorite ? (
              <BookmarkCheck className="w-5 h-5 text-orange-400" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Indicator Dots / Progress Pills */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-6 sm:right-10 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {slides.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Aller au film ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "w-6 bg-gradient-to-r from-orange-500 to-amber-400 shadow-md shadow-orange-500/50"
                    : "w-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
