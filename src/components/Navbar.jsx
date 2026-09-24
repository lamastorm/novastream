import React, { useState } from "react";
import { Film, Tv, Play, Bookmark, Search, Settings, Sparkles, Shield, Heart } from "lucide-react";
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

  const tabs = [
    { id: "home", label: "Accueil", icon: Sparkles },
    { id: "movies", label: "Films", icon: Film },
    { id: "series", label: "Séries", icon: Tv },
    { id: "anime", label: "Animes", icon: Play },
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
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform border border-orange-400/40">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <div>
            <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-100 to-amber-200">
              ERO<span className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]">DIUM</span>
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
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm shadow-orange-500/20 font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Online Spectators Badge */}
        <div
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-bold select-none shadow-sm flex-shrink-0 cursor-default"
          title="Utilisateurs connectés en direct sur Erodium"
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

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-1 max-w-xs md:max-w-md justify-end">

          {/* Desktop: inline search bar (no cursor issues on desktop) */}
          <div className="hidden md:flex flex-1">
            <DesktopSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>

          {/* Mobile: search icon button → opens SearchOverlay */}
          <button
            onClick={onOpenSearch}
            className={`md:hidden flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              searchQuery
                ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                : "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white"
            }`}
            title="Rechercher"
            aria-label="Ouvrir la recherche"
          >
            <Search className="w-4 h-4" />
            {searchQuery ? (
              <span className="text-xs max-w-[80px] truncate">{searchQuery}</span>
            ) : (
              <span className="text-xs text-zinc-500">Rechercher...</span>
            )}
          </button>

          {/* VPN Partner Link */}
          <a
            href="https://www.cyberghostvpn.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Partenaire VPN Sécurité & Débridage (-83%)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex-shrink-0"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">VPN (-83%)</span>
          </a>

          {/* Donate / Support Button */}
          <button
            onClick={onOpenDonate}
            title="Soutenir les serveurs d'Erodium (0 pub)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/15 to-orange-500/15 hover:from-rose-500/25 hover:to-orange-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex-shrink-0"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">Soutenir</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            title="Paramètres & Clé API"
            className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 transition-colors cursor-pointer"
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
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold shadow-sm shadow-orange-500/20"
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
