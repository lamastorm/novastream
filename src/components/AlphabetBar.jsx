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
        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
          activeLetter === null
            ? "bg-indigo-600 text-white shadow"
            : "bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-700"
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
            className={`w-7 h-7 flex-shrink-0 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
              isSelected
                ? "bg-pink-600 text-white shadow-md shadow-pink-600/30 scale-105"
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
