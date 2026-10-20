import React from "react";

const LETTERS = [
  "#", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

export default function AlphabetBar({ activeLetter, onSelectLetter }) {
  return (
    <div className="w-full overflow-x-auto py-2 scrollbar-none mb-5">
      <div className="inline-flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-900 border border-white/10">
        <button
          onClick={() => onSelectLetter(null)}
          className={`h-8 px-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors flex-shrink-0 cursor-pointer ${
            activeLetter === null
              ? "bg-white text-black font-extrabold"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
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
              className={`w-8 h-8 flex-shrink-0 text-xs rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                isSelected
                  ? "bg-white text-black font-extrabold"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

