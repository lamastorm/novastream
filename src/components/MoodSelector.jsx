import React from "react";
import { Sparkles, Clock, Flame, Laugh, Heart, Trophy, X, Compass } from "lucide-react";

export const MOODS = [
  {
    id: "short",
    label: "J'ai 30 min",
    icon: Clock,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
    desc: "Épisodes courts, animés ou séries intenses",
    type: "tv",
    genre: 16, // Animation
    minRating: 7.2,
  },
  {
    id: "chill",
    label: "Pas envie de réfléchir",
    icon: Laugh,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300",
    desc: "Comédies et aventures légères pour décompresser",
    type: "movie",
    genre: 35, // Comédie
    minRating: 6.5,
  },
  {
    id: "thrill",
    label: "Envie de frissonner",
    icon: Flame,
    color: "from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300",
    desc: "Thrillers palpitants, mystères et horreur",
    type: "movie",
    genre: 53, // Thriller
    minRating: 7.0,
  },
  {
    id: "masterpiece",
    label: "Un Chef-d'œuvre",
    icon: Trophy,
    color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300",
    desc: "Films légendaires acclamés par la critique (+8/10)",
    type: "movie",
    minRating: 8.2,
    sortBy: "vote_average.desc",
  },
  {
    id: "romance",
    label: "Romance & Émotion",
    icon: Heart,
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300",
    desc: "Belles histoires d'amour et drames touchants",
    type: "movie",
    genre: 10749, // Romance
    minRating: 7.0,
  },
];

export default function MoodSelector({ selectedMood, onSelectMood, onClose }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl glass border border-white/10 mb-8 animate-fade-in relative overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Que regarder ce soir ?</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                Guide d'humeur
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Choisissez votre ambiance, on s'occupe de trouver la sélection idéale
            </p>
          </div>
        </div>
        {selectedMood && (
          <button
            onClick={() => onSelectMood(null)}
            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          const isSelected = selectedMood?.id === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => onSelectMood(isSelected ? null : mood)}
              className={`p-3.5 rounded-xl border text-left transition-all relative group flex flex-col justify-between h-28 ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : `bg-gradient-to-br ${mood.color} hover:scale-[1.02] hover:border-white/20`
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? "bg-white/20 text-white" : "bg-black/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold line-clamp-1">{mood.label}</p>
                <p
                  className={`text-[10px] mt-0.5 line-clamp-1 ${
                    isSelected ? "text-indigo-100" : "text-zinc-400"
                  }`}
                >
                  {mood.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
