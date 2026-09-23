import React from "react";

const LETTERS = [
  "#", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

export default function AlphabetBar({ activeLetter, onSelectLetter }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 scrollbar-none mb-6">
      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-2 flex-shrink-0">
        Index A-Z :
      </span>

      <button
        onClick={() => onSelectLetter(null)}
        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
          activeLetter === null
            ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 border border-orange-400/40"
            : "bg-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800"
        }`}
      >
        TOUS
      </button>

      {LETTERS.map((letter) => {
        const isSelected = activeLetter === letter;
        return (
          <button
            key={letter}
            onClick={() => onSelectLetter(isSelected ? null : letter)}
            className={`w-7 h-7 flex-shrink-0 text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              isSelected
                ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md shadow-orange-600/30 scale-105 border border-orange-400/50"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
            }`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
