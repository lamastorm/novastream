import React from "react";
import { Search, Settings, Heart } from "lucide-react";
import { useLiveViewers } from "../services/liveCounter";
import DesktopSearchBar from "./DesktopSearchBar";

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  onOpenDonate,
  onOpenSearch,
}) {
  const liveViewers = useLiveViewers();

  const navItems = [
    { id: "home", label: "Accueil" },
    { id: "movies", label: "Films" },
    { id: "series", label: "Séries" },
    { id: "favorites", label: "Favoris" },
  ];

  const isAnimeActive = activeTab === "anime" && !searchQuery;

  return (
    <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-3 sm:px-6 pointer-events-none">
      {/* SkyStream Floating Pill Navbar */}
      <div className="pointer-events-auto max-w-5xl mx-auto h-13 sm:h-14 px-4 sm:px-6 rounded-full bg-[#0b0b0e]/85 backdrop-blur-xl border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.75)] flex items-center justify-between gap-3 sm:gap-5">
        {/* Brand Logo (SkyStream two-tone italic bold style) */}
        <div
          onClick={() => {
            setActiveTab("home");
            setSearchQuery("");
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e50914] to-[#99050d] flex items-center justify-center shadow-md shadow-[#e50914]/30 group-hover:scale-105 transition-transform border border-red-400/30">
            <span className="text-white font-black italic text-sm tracking-tighter">E</span>
          </div>
          <span className="text-lg sm:text-xl font-black italic tracking-tight uppercase select-none">
            <span className="text-white">ERO</span>
            <span className="text-[#e50914] drop-shadow-[0_0_12px_rgba(229,9,20,0.45)]">DIUM</span>
          </span>
        </div>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id && !searchQuery;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#e50914]/20 text-[#ff4d4d] border border-[#e50914]/40 font-bold shadow-sm"
                    : "text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Signature SkyStream Outlined Red Pill for Anime */}
          <button
            onClick={() => {
              setActiveTab("anime");
              setSearchQuery("");
            }}
            className={`ml-1 px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              isAnimeActive
                ? "bg-[#e50914] text-white border-[#e50914] shadow-md shadow-[#e50914]/30"
                : "bg-[#e50914]/10 text-[#ff4d4d] border-[#e50914]/60 hover:bg-[#e50914]/20"
            }`}
          >
            Anime
          </button>
        </nav>

        {/* Right Search & Action Pill */}
        <div className="flex items-center gap-2 flex-1 max-w-[260px] justify-end">
          {/* Desktop Search Pill */}
          <div className="hidden md:flex flex-1">
            <DesktopSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>

          {/* Mobile Search Pill */}
          <button
            onClick={onOpenSearch}
            className="md:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300 hover:text-white text-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate max-w-[90px]">{searchQuery || "Rechercher..."}</span>
          </button>

          {/* Support / Connexion-style Pill Button */}
          <button
            onClick={onOpenDonate}
            title={`${liveViewers.toLocaleString("fr-FR")} en ligne • Soutenir Erodium`}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-bold transition-all cursor-pointer flex-shrink-0"
          >
            <Heart className="w-3 h-3 fill-[#e50914] text-[#e50914]" />
            <span>Soutenir</span>
          </button>

          {/* Settings Icon */}
          <button
            onClick={onOpenSettings}
            title="Paramètres"
            className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Secondary Pill Row */}
      <div className="pointer-events-auto flex md:hidden justify-center mt-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#0b0b0e]/85 backdrop-blur-xl border border-white/10 overflow-x-auto max-w-full scrollbar-none">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id && !searchQuery;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#e50914]/25 text-[#ff4d4d] border border-[#e50914]/40 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => {
              setActiveTab("anime");
              setSearchQuery("");
            }}
            className={`px-3.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all ${
              isAnimeActive
                ? "bg-[#e50914] text-white border-[#e50914]"
                : "bg-[#e50914]/10 text-[#ff4d4d] border-[#e50914]/60"
            }`}
          >
            Anime
          </button>
        </div>
      </div>
    </header>
  );
}

