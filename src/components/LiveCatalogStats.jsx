import React, { useState, useEffect } from "react";
import { Film, Tv, Play, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export default function LiveCatalogStats({ isFloating = false }) {
  // Exact counts of available media in the Erodium verified library
  const stats = [
    {
      id: "movies",
      label: "Films HD",
      count: 5580,
      icon: Film,
      color: "from-orange-500 to-amber-500",
      textColor: "text-orange-400",
      sub: "100% 0 Pub FHD",
    },
    {
      id: "series",
      label: "Séries",
      count: 1560,
      icon: Tv,
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-400",
      sub: "Saisons intégrales",
    },
    {
      id: "anime",
      label: "Animes",
      count: 3240,
      icon: Play,
      color: "from-red-500 to-rose-500",
      textColor: "text-red-400",
      sub: "VF & VOSTFR",
    },
  ];

  // Count-up animation
  const [animatedCounts, setAnimatedCounts] = useState({
    movies: 0,
    series: 0,
    anime: 0,
  });

  useEffect(() => {
    const duration = 1200; // ms
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedCounts({
        movies: Math.round(5580 * ease),
        series: Math.round(1560 * ease),
        anime: Math.round(3240 * ease),
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  const total = animatedCounts.movies + animatedCounts.series + animatedCounts.anime;

  // Version flottante ancrée à gauche (pour grands écrans)
  if (isFloating) {
    return (
      <aside
        className="hidden 2xl:flex fixed left-5 top-28 z-30 w-60 flex-col gap-3 p-4 rounded-2xl glass-card border border-orange-500/25 shadow-2xl shadow-orange-500/10 backdrop-blur-xl animate-fade-in select-none group transition-all duration-300 hover:border-orange-500/40 hover:scale-[1.02]"
        aria-label="Statistiques de la bibliothèque Erodium"
      >
        {/* En-tête avec voyant vert animé */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Catalogue Vérifié
            </span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            0 Pub
          </span>
        </div>

        {/* Lignes de statistiques animées */}
        <div className="flex flex-col gap-2.5 py-1">
          {stats.map((s) => {
            const Icon = s.icon;
            const currentVal = animatedCounts[s.id] || 0;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${s.color} flex items-center justify-center text-white shadow-sm`}
                  >
                    <Icon className="w-3.5 h-3.5 fill-white/20" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-tight">
                      {s.label}
                    </span>
                    <span className="text-[10px] text-zinc-400 leading-tight">
                      {s.sub}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black tracking-tight ${s.textColor}`}>
                    {currentVal.toLocaleString("fr-FR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pied : Total des titres disponibles */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Total disponible :</span>
            <span className="font-black text-amber-300">
              {total.toLocaleString("fr-FR")}+
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/20 justify-center">
            <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span>100% lisibles sans redirection</span>
          </div>
        </div>
      </aside>
    );
  }

  // Version bannière intégrée (pour mobiles / tablettes / en haut de l'accueil)
  return (
    <div className="w-full mb-6 p-3 sm:p-4 rounded-2xl glass-card border border-orange-500/25 shadow-xl shadow-orange-500/10 backdrop-blur-xl animate-fade-in select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Titre & Statut */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Bibliothèque Erodium Natif</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⚡ 100% 0 Pub Direct
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Chaque titre est vérifié et immédiatement lisible sans pop-up ni pub.
            </p>
          </div>
        </div>

        {/* Compteurs horizontaux */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-shrink-0">
          {stats.map((s) => {
            const Icon = s.icon;
            const currentVal = animatedCounts[s.id] || 0;
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900/60 border border-white/5"
              >
                <div
                  className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${s.color} flex items-center justify-center text-white flex-shrink-0`}
                >
                  <Icon className="w-3 h-3 fill-white/20" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs sm:text-sm font-black leading-tight ${s.textColor}`}>
                    {currentVal.toLocaleString("fr-FR")}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
