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
      {/* HEADER SIMPLIFIÉ SUR FOND NOIR ÉPURÉ */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-4 select-none bg-black">
        <div className="relative w-full flex flex-col gap-4">
          {/* TOP BAR (Spectateurs + Surprise à gauche | Recherche + Soutenir + Paramètres à droite) */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Top-Left: Live Viewers & Surprise */}
            <div className="flex items-center gap-2">
              <div
                title="Spectateurs connectés sur Erodium"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-[11px] font-bold text-white"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300">{liveViewers.toLocaleString("fr-FR")}</span>
                <span className="hidden sm:inline text-zinc-400">en ligne</span>
              </div>

              {onRandomSurprise && (
                <button
                  onClick={onRandomSurprise}
                  title="Titre aléatoire"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[11px] font-bold text-orange-400 hover:text-white transition-colors cursor-pointer"
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
                className="md:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 hover:text-white text-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-orange-400" />
                <span className="truncate max-w-[95px]">{searchQuery || "Rechercher..."}</span>
              </button>

              <button
                onClick={onOpenDonate}
                title="Soutenir les serveurs Erodium"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
              >
                <Heart className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                <span>Soutenir</span>
              </button>

              <button
                onClick={onOpenSettings}
                title="Paramètres"
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* LOGO ERODIUM PROPRE & ÉPURÉ */}
          <div
            onClick={() => {
              setActiveTab("home");
              setSearchQuery("");
            }}
            title="Retour à l'accueil Erodium"
            className="flex flex-col items-center justify-center py-2 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <ErodiumIconBadge type="home" variant="badge" size="lg" />
              <span className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
                <span className="text-white">ERO</span>
                <span className="text-orange-500">DIUM</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-medium tracking-widest uppercase mt-1">
              Votre univers de streaming
            </p>
          </div>

          {/* BARRE D'ONGLETS SIMPLE & NETTE */}
          <div className="flex justify-center pb-2">
            <nav
              aria-label="Navigation principale"
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-1 overflow-x-auto max-w-full scrollbar-none"
            >
              {bannerTabs.map((tab) => {
                const isActive = activeTab === tab.id && !searchQuery;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase transition-colors cursor-pointer flex-shrink-0 ${
                      isActive
                        ? "bg-white text-black font-extrabold"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    <ErodiumIconBadge
                      type={tab.id}
                      variant="badge"
                      size="sm"
                      active={isActive}
                    />
                    <span>{tab.label}</span>
                  </button>
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
          className={`max-w-5xl mx-auto h-13 sm:h-14 px-4 sm:px-5 rounded-full bg-black/95 border border-white/10 flex items-center justify-between gap-3 ${
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
              <span className="text-orange-500">DIUM</span>
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
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white text-black font-extrabold"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <ErodiumIconBadge
                    type={tab.id}
                    variant="inline"
                    size="sm"
                    active={isActive}
                  />
                  <span>{tab.label}</span>
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


