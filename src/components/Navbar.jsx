import React, { useState, useEffect } from "react";
import {
  Search,
  Settings,
  Heart,
  Sparkles,
  Clapperboard,
  Tv,
  Gamepad2,
  Star,
  Dice5,
} from "lucide-react";
import { useLiveViewers } from "../services/liveCounter";
import DesktopSearchBar from "./DesktopSearchBar";

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  onOpenDonate,
  onRandomSurprise,
  onOpenSearch,
}) {
  const liveViewers = useLiveViewers();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 230);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const bannerTabs = [
    { id: "home", label: "ACCUEIL", icon: Sparkles },
    { id: "movies", label: "FILMS", icon: Clapperboard },
    { id: "series", label: "SÉRIES", icon: Tv },
    { id: "anime", label: "ANIMES", icon: Gamepad2 },
    { id: "favorites", label: "FAVORIS", icon: Star },
  ];

  return (
    <>
      {/* INTERACTIVE ERODIUM BANNER HEADER */}
      <header className="relative z-30 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 select-none">
        <div className="relative w-full h-[210px] sm:h-[260px] md:h-[300px] rounded-3xl overflow-hidden border border-purple-500/35 shadow-[0_14px_45px_rgba(0,0,0,0.8),0_0_35px_rgba(139,92,246,0.22)] bg-[#070510]">
          {/* Banner Artwork Background */}
          <img
            src="/erodium-banner.png"
            alt="Erodium — Votre Univers de Streaming"
            className="w-full h-full object-cover object-center"
          />

          {/* Subtle vignette to blend the interactive dock seamlessly over the static bottom text */}
          <div
            className="absolute inset-x-0 bottom-0 h-[44%] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 55% 85% at 50% 72%, rgba(12, 6, 24, 0.92) 25%, rgba(12, 6, 24, 0.55) 65%, transparent 100%)",
            }}
          />

          {/* TOP BAR OVERLAY (Live Badge + Surprise Left | Search + Support + Settings Right) */}
          <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-5 z-20 flex items-center justify-between gap-2">
            {/* Top-Left: Live Viewers & Surprise */}
            <div className="flex items-center gap-2">
              <div
                title="Spectateurs connectés sur Erodium"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-xl border border-white/15 text-[11px] font-bold text-white shadow-lg"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-300">{liveViewers.toLocaleString("fr-FR")}</span>
                <span className="hidden sm:inline text-zinc-300">en ligne</span>
              </div>

              {onRandomSurprise && (
                <button
                  onClick={onRandomSurprise}
                  title="Titre aléatoire"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-xl border border-orange-500/35 hover:border-orange-400 text-[11px] font-bold text-orange-200 hover:text-white transition-all duration-300 hover:scale-105 cursor-pointer shadow-lg"
                >
                  <Dice5 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Surprise</span>
                </button>
              )}
            </div>

            {/* Top-Right: Search Bar + Support + Settings */}
            <div className="flex items-center gap-2 flex-1 max-w-[340px] justify-end">
              <div className="hidden md:flex flex-1">
                <DesktopSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              </div>

              <button
                onClick={onOpenSearch}
                className="md:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-xl border border-purple-500/40 text-zinc-200 hover:text-white text-xs cursor-pointer shadow-lg"
              >
                <Search className="w-3.5 h-3.5 text-orange-400" />
                <span className="truncate max-w-[95px]">{searchQuery || "Rechercher..."}</span>
              </button>

              <button
                onClick={onOpenDonate}
                title="Soutenir les serveurs Erodium"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-erodium-gradient backdrop-blur-xl border border-purple-500/40 text-white text-xs font-bold transition-all duration-300 hover:scale-105 cursor-pointer flex-shrink-0 shadow-lg"
              >
                <Heart className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                <span>Soutenir</span>
              </button>

              <button
                onClick={onOpenSettings}
                title="Paramètres"
                className="p-2 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-xl border border-white/15 hover:border-purple-500/50 text-zinc-200 hover:text-white transition-all duration-300 hover:scale-105 cursor-pointer flex-shrink-0 shadow-lg"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CENTER CLICKABLE HITBOX OVER THE "ERODIUM" LOGO */}
          <div
            onClick={() => {
              setActiveTab("home");
              setSearchQuery("");
            }}
            title="Retour à l'accueil Erodium"
            className="absolute inset-x-1/4 top-[22%] bottom-[38%] z-10 cursor-pointer"
          />

          {/* BOTTOM INTEGRATED NAVIGATION DOCK (Matches the banner's icon & separator style) */}
          <div className="absolute bottom-3 sm:bottom-5 inset-x-2 z-20 flex justify-center">
            <nav
              aria-label="Navigation principale"
              className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-[#090514]/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_25px_rgba(249,115,22,0.18)] overflow-x-auto max-w-full scrollbar-none"
            >
              {bannerTabs.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id && !searchQuery;
                return (
                  <React.Fragment key={tab.id}>
                    {idx > 0 && (
                      <span className="h-5 sm:h-6 w-[1px] bg-gradient-to-b from-orange-500/50 via-fuchsia-500/50 to-violet-500/50 mx-1 sm:mx-2.5 flex-shrink-0" />
                    )}
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery("");
                      }}
                      className={`group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl transition-all duration-300 cursor-pointer flex-shrink-0 ${
                        isActive
                          ? "bg-erodium-gradient glow-erodium text-white scale-105 shadow-lg"
                          : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:scale-110 ${
                          isActive
                            ? "text-white"
                            : idx < 2
                            ? "text-orange-400"
                            : idx === 2
                            ? "text-pink-400"
                            : "text-purple-400"
                        }`}
                      />
                      <span className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase">
                        {tab.label}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* COMPACT FLOATING NAVBAR WHEN SCROLLED DOWN */}
      <div
        className={`fixed top-0 inset-x-0 z-40 pt-2.5 px-3 sm:px-6 pointer-events-none transition-all duration-300 ${
          isScrolled
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div
          className={`max-w-5xl mx-auto h-12 sm:h-13 px-4 sm:px-6 rounded-full bg-[#090910]/90 backdrop-blur-xl border border-purple-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(139,92,246,0.22)] flex items-center justify-between gap-3 ${
            isScrolled ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div
            onClick={() => {
              setActiveTab("home");
              setSearchQuery("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 cursor-pointer select-none group flex-shrink-0"
          >
            <div className="w-7 h-7 rounded-full bg-erodium-gradient glow-erodium flex items-center justify-center border border-white/25">
              <span className="text-white font-black italic text-xs">E</span>
            </div>
            <span className="text-base sm:text-lg font-black italic tracking-tight uppercase">
              <span className="text-white">ERO</span>
              <span className="text-erodium-gradient">DIUM</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {bannerTabs.map((tab) => {
              const isActive = activeTab === tab.id && !searchQuery;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery("");
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-erodium-gradient glow-erodium text-white"
                      : "text-zinc-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-1 max-w-[240px] justify-end">
            <div className="hidden md:flex flex-1">
              <DesktopSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </div>
            <button
              onClick={onOpenSearch}
              className="md:hidden flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-purple-500/30 text-zinc-200 text-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-orange-400" />
              <span>Rechercher</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


