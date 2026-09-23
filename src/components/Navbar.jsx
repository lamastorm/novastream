import React, { useState } from "react";
import { Film, Tv, Play, Bookmark, Search, Settings, Sparkles, X, Layers, Users } from "lucide-react";
import { useLiveViewers } from "../services/liveCounter";

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  onRandomSurprise,
}) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const liveViewers = useLiveViewers();

  const tabs = [
    { id: "home", label: "Accueil", icon: Sparkles },
    { id: "movies", label: "Films", icon: Film },
    { id: "series", label: "Séries", icon: Tv },
    { id: "anime", label: "Animes", icon: Play },
    { id: "trakt", label: "Listes Trakt", icon: Layers, badge: "Sélections" },
    { id: "favorites", label: "Favoris", icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => {
            setActiveTab("home");
            setSearchQuery("");
          }}
          className="flex items-center gap-2 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-purple-200">
              NOVA<span className="text-indigo-400">STREAM</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !searchQuery;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Online Spectators Badge */}
        <div
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-bold select-none shadow-sm flex-shrink-0 cursor-default"
          title="Utilisateurs connectés en direct sur NovaStream"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-white font-black tracking-wide">
            {liveViewers.toLocaleString("fr-FR")}
          </span>
          <span className="text-emerald-400/80 font-medium text-[11px]">en ligne</span>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-1 max-w-xs md:max-w-md justify-end">
          {/* Random Surprise Button */}
          <button
            onClick={onRandomSurprise}
            title="Surprenez-moi ! (Tirage aléatoire d'un film ou anime)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 hover:from-pink-600/50 hover:to-purple-600/50 border border-pink-500/30 text-pink-300 hover:text-white text-xs font-bold transition-all whitespace-nowrap shadow-sm hover:scale-105"
          >
            <span>🎲</span>
            <span className="hidden lg:inline">Surprenez-moi</span>
          </button>

          <div
            className={`relative flex items-center w-full rounded-xl transition-all ${
              isSearchFocused
                ? "ring-2 ring-indigo-500 bg-zinc-900"
                : "bg-zinc-900/80 hover:bg-zinc-900 border border-white/10"
            }`}
          >
            <Search className="w-4 h-4 text-zinc-400 ml-3 flex-shrink-0" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Rechercher films, séries, animes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-transparent px-3 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 mr-2 text-zinc-400 hover:text-white rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden lg:flex items-center text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-white/10 mr-2 flex-shrink-0">
                Ctrl+K
              </span>
            )}
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            title="Paramètres & Clé API"
            className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden border-t border-white/5 px-2 py-1.5 overflow-x-auto gap-1 items-center justify-between">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !searchQuery;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold flex-shrink-0 ml-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>{liveViewers.toLocaleString("fr-FR")} live</span>
        </div>
      </div>
    </header>
  );
}
