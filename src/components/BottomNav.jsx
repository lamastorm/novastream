import React from "react";
import { Sparkles, Film, Tv, Play, Bookmark, Search } from "lucide-react";

export default function BottomNav({
  activeTab,
  setActiveTab,
  onOpenSearch,
}) {
  const items = [
    { id: "home", label: "Accueil", icon: Sparkles },
    { id: "movies", label: "Films", icon: Film },
    { id: "series", label: "Séries", icon: Tv },
    { id: "anime", label: "Animes", icon: Play },
    { id: "favorites", label: "Favoris", icon: Bookmark },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-black/90 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl transition-all select-none"
      role="navigation"
      aria-label="Navigation Mobile"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
              isActive
                ? "text-orange-400 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {/* Active glowing indicator pill at top */}
            {isActive && (
              <span className="absolute -top-2 w-8 h-1 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 shadow-[0_0_10px_#f97316]" />
            )}
            <div
              className={`p-1 rounded-xl transition-all ${
                isActive
                  ? "bg-orange-500/20 shadow-sm shadow-orange-500/30 scale-110"
                  : ""
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* Bouton Recherche Rapide Mobile */}
      <button
        onClick={onOpenSearch}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl text-zinc-400 hover:text-orange-400 transition-all cursor-pointer"
        title="Rechercher un film ou animé"
      >
        <div className="p-1 rounded-xl">
          <Search className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Recherche</span>
      </button>
    </nav>
  );
}
