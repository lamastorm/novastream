import React from "react";

const LETTERS = [
  "#", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

export default function AlphabetBar({ activeLetter, onSelectLetter }) {
  return (
    <div className="w-full overflow-x-auto py-2 scrollbar-none mb-5">
      <div className="inline-flex items-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-[#090414]/90 backdrop-blur-xl border border-purple-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_28px_rgba(255,123,0,0.14),0_0_28px_rgba(157,78,221,0.2)]">
        <button
          onClick={() => onSelectLetter(null)}
          className={`h-9 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-300 flex-shrink-0 cursor-pointer ${
            activeLetter === null
              ? "text-white shadow-[0_0_20px_rgba(255,123,0,0.65),0_0_25px_rgba(255,42,133,0.45)] border border-orange-300/60 scale-[1.03]"
              : "erodium-letter-btn text-zinc-200 hover:text-white"
          }`}
          style={
            activeLetter === null
              ? {
                  background:
                    "linear-gradient(135deg, #ff9e00 0%, #ff2a85 55%, #b5179e 100%)",
                }
              : undefined
          }
        >
          TOUS
        </button>

        {LETTERS.map((letter) => {
          const isSelected = activeLetter === letter;
          return (
            <button
              key={letter}
              onClick={() => onSelectLetter(isSelected ? null : letter)}
              className={`w-9 h-9 flex-shrink-0 text-xs font-extrabold rounded-xl flex items-center justify-center cursor-pointer transition-all duration-250 ${
                isSelected
                  ? "text-white shadow-[0_0_20px_rgba(255,123,0,0.7),0_0_25px_rgba(255,42,133,0.5)] border border-orange-300/60 scale-105"
                  : "erodium-letter-btn text-white/90 hover:text-white"
              }`}
              style={
                isSelected
                  ? {
                      background:
                        "linear-gradient(135deg, #ff9e00 0%, #ff2a85 55%, #b5179e 100%)",
                    }
                  : undefined
              }
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

