import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { tmdbApi, IMAGE_BASE_URL } from "../api/tmdb";

const GENRE_NAMES = {
  28: "Action",
  12: "Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Famille",
  14: "Fantastique",
  36: "Histoire",
  27: "Horreur",
  10402: "Musique",
  9648: "Mystère",
  10749: "Romance",
  878: "Science-Fiction",
  10770: "Téléfilm",
  53: "Thriller",
  10752: "Guerre",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10765: "Science-Fiction & Fantastique",
  10768: "War & Politics",
};

export default function HeroBanner({
  items = [],
  item,
  onPlay,
  onMoreInfo,
}) {
  const rawSlides = (items && items.length > 0 ? items : item ? [item] : []).filter(
    (s) => s && (s.backdrop_path || s.poster_path || s.title || s.name)
  );

  const qualifiedSlides = rawSlides.filter((s) => {
    if (!s) return false;
    const pop = Number(s.popularity) || 0;
    const votes = Number(s.vote_count) || 0;
    const voteAvg = Number(s.vote_average) || 0;
    const date = String(s.release_date || s.first_air_date || "");
    const year = date ? parseInt(date.slice(0, 4), 10) : 0;

    if (!s.backdrop_path && rawSlides.some((x) => x.backdrop_path)) return false;
    if (voteAvg >= 8.8 && votes < 30 && pop < 25) return false;
    if (year > 0 && year < 2023 && pop < 20 && votes < 50) return false;
    if (pop < 12 && votes < 15) return false;

    return true;
  });

  const baseSlides = qualifiedSlides.length > 0 ? qualifiedSlides : rawSlides;
  const slides = [...baseSlides]
    .sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0))
    .slice(0, 6);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [logosByKey, setLogosByKey] = useState({});
  const touchStartX = useRef(null);

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

  // Preload official TMDB transparent logo for current slide
  const currentItem = slides[currentIndex] || slides[0];
  useEffect(() => {
    if (!currentItem?.id) return;
    const type =
      currentItem.media_type === "tv" || Boolean(currentItem.first_air_date && !currentItem.release_date)
        ? "tv"
        : "movie";
    const key = `${type}_${currentItem.id}`;
    if (logosByKey[key] !== undefined) return;

    let cancelled = false;
    tmdbApi.getLogoUrl(type, currentItem.id).then((url) => {
      if (!cancelled) {
        setLogosByKey((prev) => ({ ...prev, [key]: url || null }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentItem?.id, currentItem?.media_type, currentItem?.first_air_date, currentItem?.release_date]);

  if (slides.length === 0 || !currentItem) return null;

  const isTV =
    currentItem.media_type === "tv" ||
    Boolean(currentItem.first_air_date && !currentItem.release_date);
  const mediaTypeKey = `${isTV ? "tv" : "movie"}_${currentItem.id}`;
  const logoUrl = logosByKey[mediaTypeKey];

  const title = currentItem.title || currentItem.name || "";
  const overview =
    currentItem.overview ||
    "Découvrez ce titre incontournable en streaming haute définition sans publicité.";
  const date = String(currentItem.release_date || currentItem.first_air_date || "");
  const year = date
    ? isNaN(new Date(date).getFullYear())
      ? ""
      : String(new Date(date).getFullYear())
    : "";
  const voteNum = Number(currentItem.vote_average);
  const rating = !isNaN(voteNum) && voteNum > 0 ? voteNum.toFixed(1) : null;

  const genreText = Array.isArray(currentItem.genres) && currentItem.genres.length > 0
    ? currentItem.genres.slice(0, 3).map((g) => g.name).filter(Boolean).join(", ")
    : Array.isArray(currentItem.genre_ids) && currentItem.genre_ids.length > 0
    ? currentItem.genre_ids
        .slice(0, 3)
        .map((id) => GENRE_NAMES[id])
        .filter(Boolean)
        .join(", ")
    : "";

  const metaParts = [
    isTV ? "Série" : "Film",
    year,
    genreText,
    rating ? `★ ${rating}` : null,
  ].filter(Boolean);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 45) nextSlide();
    else if (diff < -45) prevSlide();
    touchStartX.current = null;
    setIsPaused(false);
  };

  return (
    <div
      className="group relative w-full h-[66vh] min-h-[480px] max-h-[700px] mb-10 rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/5 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Slides */}
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
                className={`w-full h-full object-cover object-center brightness-[0.75] transform transition-transform duration-10000 ${
                  isCurrent ? "scale-105" : "scale-100"
                }`}
                loading={idx === 0 ? "eager" : "lazy"}
              />
            ) : (
              <div className="w-full h-full bg-zinc-950" />
            )}
          </div>
        );
      })}

      {/* SkyStream Deep Cinematic Vignette Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/45 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/95 via-[#050507]/55 to-transparent z-10 pointer-events-none" />

      {/* Left / Right Hover Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Précédent"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Suivant"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Hero Foreground Content */}
      <div
        key={currentItem.id || currentIndex}
        className="relative z-20 h-full px-6 sm:px-12 flex flex-col justify-end pb-12 sm:pb-14 max-w-2xl animate-fade-in"
      >
        {/* Animated Orange & Violet Category Badge */}
        <div className="mb-3">
          <span className="inline-block bg-erodium-gradient glow-erodium text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded shadow-md">
            {isTV ? "SÉRIE" : "FILM"}
          </span>
        </div>

        {/* Official TMDB Logo or Bold Uppercase Title */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title}
            className="max-h-20 sm:max-h-28 max-w-[260px] sm:max-w-[380px] w-auto object-contain object-left mb-3 drop-shadow-[0_6px_20px_rgba(0,0,0,0.85)]"
          />
        ) : (
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-[1.05] mb-3 drop-shadow-lg">
            {title}
          </h1>
        )}

        {/* Inline Metadata Line (Film • 2026 • Genres • ★ 6.3) */}
        <p className="text-xs sm:text-[13px] font-medium text-zinc-300 mb-3">
          {metaParts.join(" · ")}
        </p>

        {/* Synopsis */}
        <p className="text-zinc-300/90 text-xs sm:text-sm line-clamp-3 mb-6 max-w-xl leading-relaxed">
          {overview}
        </p>

        {/* Action Buttons (Image 4 style : Capsule Néon "Lecture" + Capsule Contour Néon "Plus d'infos") */}
        <div className="flex flex-wrap items-center gap-3.5">
          <button
            onClick={() => onPlay(currentItem)}
            className="erodium-btn-play flex items-center gap-3 px-7 py-3 sm:py-3.5 text-white font-extrabold text-sm sm:text-base active:scale-95 cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 flex-shrink-0"
              style={{
                filter:
                  "drop-shadow(0 0 6px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 12px rgba(255, 42, 133, 0.9))",
              }}
            >
              <polygon
                points="6 3 20 12 6 21 6 3"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="tracking-wide drop-shadow-sm">Lecture</span>
          </button>

          <button
            onClick={() => onMoreInfo(currentItem)}
            className="erodium-btn-info flex items-center gap-3 px-6 py-3 sm:py-3.5 text-white font-extrabold text-sm sm:text-base active:scale-95 cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 flex-shrink-0"
              style={{
                filter: "drop-shadow(0 0 8px rgba(255, 80, 120, 0.55))",
              }}
            >
              <defs>
                <linearGradient id="erodium-info-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff9e00" />
                  <stop offset="60%" stopColor="#ff2a85" />
                  <stop offset="100%" stopColor="#b5179e" />
                </linearGradient>
              </defs>
              <circle
                cx="12"
                cy="12"
                r="9.5"
                fill="none"
                stroke="url(#erodium-info-grad)"
                strokeWidth="2.3"
              />
              <line
                x1="12"
                y1="11"
                x2="12"
                y2="16.5"
                stroke="url(#erodium-info-grad)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="12" cy="7.5" r="1.3" fill="url(#erodium-info-grad)" />
            </svg>
            <span className="tracking-wide">Plus d'infos</span>
          </button>
        </div>
      </div>

      {/* Bottom Right Dash Progress Indicators (Animated Orange & Violet style) */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 right-6 sm:right-10 z-30 flex items-center gap-2">
          {slides.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "w-8 bg-erodium-gradient shadow-[0_0_12px_rgba(249,115,22,0.7)]"
                    : "w-6 bg-white/25 hover:bg-white/50"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

