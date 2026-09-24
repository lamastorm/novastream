import React, { useState } from "react";
import { Shield, ShieldCheck, ExternalLink, X, Zap, Lock } from "lucide-react";
import { MONETIZATION_CONFIG } from "../config/monetization";

export default function VpnBanner({ isCompact = false }) {
  const { vpn } = MONETIZATION_CONFIG;
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("erodium_vpn_banner_dismissed") === "true";
  });

  if (!vpn.enabled || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("erodium_vpn_banner_dismissed", "true");
  };

  if (isCompact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-indigo-500/20 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{vpn.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {vpn.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-300 line-clamp-1">{vpn.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={vpn.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-600/30 whitespace-nowrap"
          >
            <span>{vpn.ctaText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={handleDismiss}
            aria-label="Masquer"
            className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1326] via-[#101935] to-[#120f29] border border-indigo-500/30 p-6 sm:p-8 shadow-2xl my-8">
      {/* Glow background effects */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        aria-label="Fermer la recommandation"
        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>{vpn.badge}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {vpn.title}
          </h3>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            {vpn.description}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
            {vpn.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <a
            href={vpn.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 text-center cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>{vpn.ctaText}</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
