import React from "react";

export const PLATFORMS = [
  {
    id: 213,
    providerId: 8,
    name: "Netflix",
    color: "from-red-600 to-rose-700",
    badge: "N",
  },
  {
    id: 1112,
    providerId: 283,
    name: "Crunchyroll",
    color: "from-orange-500 to-amber-600",
    badge: "CR",
  },
  {
    id: 2739,
    providerId: 337,
    name: "Disney+",
    color: "from-blue-600 to-indigo-700",
    badge: "D+",
  },
  {
    id: 1024,
    providerId: 119,
    name: "Prime Video",
    color: "from-sky-600 to-cyan-700",
    badge: "PV",
  },
  {
    id: 49,
    providerId: 1899,
    name: "HBO Max",
    color: "from-purple-600 to-violet-800",
    badge: "MAX",
  },
];

export default function PlatformFilter({ selectedPlatform, onSelectPlatform }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6">
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1 flex-shrink-0">
        Plateformes :
      </span>

      <button
        onClick={() => onSelectPlatform(null)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
          selectedPlatform === null
            ? "bg-white/20 text-white border border-white/20"
            : "bg-zinc-800/80 text-zinc-400 hover:text-white border border-white/5"
        }`}
      >
        Toutes
      </button>

      {PLATFORMS.map((platform) => {
        const isSelected = selectedPlatform === platform.id;
        return (
          <button
            key={platform.id}
            onClick={() =>
              onSelectPlatform(isSelected ? null : platform.id)
            }
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              isSelected
                ? `bg-gradient-to-r ${platform.color} text-white shadow-lg ring-2 ring-white/30`
                : "bg-zinc-900/90 text-zinc-300 hover:text-white border border-white/10 hover:bg-zinc-800"
            }`}
          >
            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-black">
              {platform.badge}
            </span>
            <span>{platform.name}</span>
          </button>
        );
      })}
    </div>
  );
}
