import React from "react";
import { Search } from "lucide-react";
import ErodiumIconBadge from "./ErodiumIconBadge";

export default function BottomNav({
  activeTab,
  setActiveTab,
  onOpenSearch,
}) {
  const items = [
    { id: "home", label: "Accueil" },
    { id: "movies", label: "Films" },
    { id: "series", label: "Séries" },
    { id: "anime", label: "Animes" },
    { id: "favorites", label: "Favoris" },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-black border-t border-white/10 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none"
      role="navigation"
      aria-label="Navigation Mobile"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`group flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
              isActive
                ? "text-white font-extrabold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {/* Active glowing indicator pill at top */}
            {isActive && (
              <span className="absolute -top-2 w-8 h-1 rounded-full bg-erodium-gradient shadow-[0_0_12px_rgba(249,115,22,0.85)]" />
            )}
            <ErodiumIconBadge
              type={item.id}
              variant="badge"
              size="sm"
              active={isActive}
            />
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
        <div className="w-7 h-7 rounded-lg -skew-x-12 p-[1.5px] bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center">
          <div className="w-full h-full rounded-[inherit] bg-[#080312] flex items-center justify-center">
            <Search className="w-4 h-4 text-orange-400 skew-x-12" />
          </div>
        </div>
        <span className="text-[10px] tracking-tight">Recherche</span>
      </button>
    </nav>
  );
}

