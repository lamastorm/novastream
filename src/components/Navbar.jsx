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
      {/* SkyStream Floating Pill Navbar with Orange/Violet Ambient Glow */}
      <div className="pointer-events-auto max-w-5xl mx-auto h-13 sm:h-14 px-4 sm:px-6 rounded-full bg-[#090910]/85 backdrop-blur-xl border border-purple-500/25 shadow-[0_10px_35px_rgba(0,0,0,0.75),0_0_25px_rgba(139,92,246,0.18)] flex items-center justify-between gap-3 sm:gap-5 transition-all duration-300">
        {/* Brand Logo (Animated Orange & Violet Gradient) */}
        <div
          onClick={() => {
            setActiveTab("home");
            setSearchQuery("");
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-erodium-gradient glow-erodium flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 border border-white/25">
            <span className="text-white font-black italic text-sm tracking-tighter">E</span>
          </div>
          <span className="text-lg sm:text-xl font-black italic tracking-tight uppercase select-none">
            <span className="text-white">ERO</span>
            <span className="text-erodium-gradient drop-shadow-[0_0_14px_rgba(168,85,247,0.55)]">
              DIUM
            </span>
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
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/25 via-fuchsia-500/25 to-violet-600/25 text-orange-300 border border-purple-500/50 font-bold shadow-[0_0_18px_rgba(168,85,247,0.3)] scale-105"
                    : "text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Outlined Animated Orange/Violet Pill for Anime */}
          <button
            onClick={() => {
              setActiveTab("anime");
              setSearchQuery("");
            }}
            className={`ml-1 px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer border ${
              isAnimeActive
                ? "bg-erodium-gradient text-white border-white/30 glow-erodium scale-105"
                : "bg-gradient-to-r from-orange-500/10 to-violet-600/15 text-purple-300 border-purple-500/60 hover:border-orange-400/80 hover:text-white hover:shadow-[0_0_18px_rgba(249,115,22,0.35)]"
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
            className="md:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-purple-500/25 text-zinc-300 hover:text-white text-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-orange-400" />
            <span className="truncate max-w-[90px]">{searchQuery || "Rechercher..."}</span>
          </button>

          {/* Support Pill Button */}
          <button
            onClick={onOpenDonate}
            title={`${liveViewers.toLocaleString("fr-FR")} en ligne • Soutenir Erodium`}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-violet-600/20 hover:from-orange-500/30 hover:to-violet-600/35 border border-purple-500/35 text-white text-xs font-bold transition-all duration-300 hover:scale-105 cursor-pointer flex-shrink-0"
          >
            <Heart className="w-3 h-3 fill-orange-400 text-orange-400 animate-pulse" />
            <span>Soutenir</span>
          </button>

          {/* Settings Icon */}
          <button
            onClick={onOpenSettings}
            title="Paramètres"
            className="p-2 rounded-full bg-white/[0.06] hover:bg-gradient-to-r hover:from-orange-500/25 hover:to-violet-600/25 border border-white/10 hover:border-purple-500/40 text-zinc-300 hover:text-white transition-all duration-300 cursor-pointer flex-shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Secondary Pill Row */}
      <div className="pointer-events-auto flex md:hidden justify-center mt-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#090910]/90 backdrop-blur-xl border border-purple-500/25 overflow-x-auto max-w-full scrollbar-none">
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
                    ? "bg-gradient-to-r from-orange-500/30 to-violet-600/30 text-orange-300 border border-purple-500/50 font-bold"
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
                ? "bg-erodium-gradient text-white border-white/30"
                : "bg-purple-500/10 text-purple-300 border-purple-500/50"
            }`}
          >
            Anime
          </button>
        </div>
      </div>
    </header>
  );
}


