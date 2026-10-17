import React, { useState, useEffect } from "react";
import { Search, Settings, Heart, Dice5 } from "lucide-react";
import { useLiveViewers } from "../services/liveCounter";
import DesktopSearchBar from "./DesktopSearchBar";
import ErodiumIconBadge from "./ErodiumIconBadge";

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
    { id: "home", label: "ACCUEIL" },
    { id: "movies", label: "FILMS" },
    { id: "series", label: "SÉRIES" },
    { id: "anime", label: "ANIMES" },
    { id: "favorites", label: "FAVORIS" },
  ];

  return (
    <>
      {/* TRANSPARENT UNIFIED HEADER OVER THE FULL-SCREEN ERODIUM BACKGROUND */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 select-none">
        <div className="relative w-full h-[185px] sm:h-[225px] md:h-[260px] flex flex-col justify-between">
          {/* TOP BAR OVERLAY (Live Badge + Surprise Left | Search + Support + Settings Right) */}
          <div className="relative z-20 flex items-center justify-between gap-2 pt-1">
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

          {/* CENTER CLICKABLE HITBOX OVER THE "ERODIUM" LOGO IN THE UNIFIED BACKGROUND */}
          <div
            onClick={() => {
              setActiveTab("home");
              setSearchQuery("");
            }}
            title="Retour à l'accueil Erodium"
            className="absolute inset-x-1/4 top-[14%] bottom-[32%] z-10 cursor-pointer"
          />

          {/* BOTTOM NAVIGATION DOCK SITTING SEAMLESSLY BELOW "VOTRE UNIVERS DE STREAMING" */}
          <div className="relative z-20 flex justify-center pb-1">
            <nav
              aria-label="Navigation principale"
              className="flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0b0518]/90 backdrop-blur-2xl border border-purple-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_28px_rgba(249,115,22,0.16),0_0_28px_rgba(139,92,246,0.2)] overflow-x-auto max-w-full scrollbar-none"
            >
              {bannerTabs.map((tab, idx) => {
                const isActive = activeTab === tab.id && !searchQuery;
                return (
                  <React.Fragment key={tab.id}>
                    {idx > 0 && (
                      <span
                        className="h-6 sm:h-7 w-[1.5px] mx-1 sm:mx-2.5 flex-shrink-0 rounded-full opacity-75"
                        style={{
                          background:
                            "linear-gradient(180deg, #ff8800 0%, #ff2a85 50%, #8338ec 100%)",
                        }}
                      />
                    )}
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery("");
                      }}
                      className={`group relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all duration-300 cursor-pointer flex-shrink-0 ${
                        isActive
                          ? "text-white shadow-[0_0_24px_rgba(255,100,50,0.55)] scale-[1.03]"
                          : "text-zinc-200 hover:text-white hover:bg-white/[0.05]"
                      }`}
                      style={
                        isActive
                          ? {
                              background:
                                "linear-gradient(90deg, #ff7b00 0%, #ff3b6b 55%, #ec38bc 100%)",
                            }
                          : undefined
                      }
                    >
                      <ErodiumIconBadge
                        type={tab.id}
                        variant="badge"
                        size="sm"
                        active={isActive}
                      />
                      <span className="text-[11px] sm:text-[13px] font-black tracking-wider uppercase text-white drop-shadow-sm">
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
          className={`max-w-5xl mx-auto h-13 sm:h-14 px-4 sm:px-5 rounded-full bg-[#0a0516]/95 backdrop-blur-2xl border border-purple-500/35 shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(139,92,246,0.25)] flex items-center justify-between gap-3 ${
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
            <ErodiumIconBadge type="home" variant="badge" size="sm" />
            <span className="text-base sm:text-lg font-black italic tracking-tight uppercase">
              <span className="text-white">ERO</span>
              <span className="text-erodium-gradient">DIUM</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {bannerTabs.map((tab, idx) => {
              const isActive = activeTab === tab.id && !searchQuery;
              return (
                <React.Fragment key={tab.id}>
                  {idx > 0 && (
                    <span
                      className="h-5 w-[1px] mx-1 rounded-full opacity-60"
                      style={{
                        background:
                          "linear-gradient(180deg, #ff8800 0%, #ff2a85 50%, #8338ec 100%)",
                      }}
                    />
                  )}
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
                      isActive
                        ? "text-white shadow-[0_0_18px_rgba(255,100,50,0.5)]"
                        : "text-zinc-300 hover:text-white hover:bg-white/5"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(90deg, #ff7b00 0%, #ff3b6b 55%, #ec38bc 100%)",
                          }
                        : undefined
                    }
                  >
                    <ErodiumIconBadge
                      type={tab.id}
                      variant="inline"
                      size="sm"
                      active={isActive}
                    />
                    <span>{tab.label}</span>
                  </button>
                </React.Fragment>
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


