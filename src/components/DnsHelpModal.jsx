import React, { useState, useEffect } from "react";
import { ShieldCheck, X, Globe, ExternalLink, Check, Zap, AlertTriangle, Sparkles } from "lucide-react";

export default function DnsHelpModal({ isOpen, onClose }) {
  // Détection automatique du navigateur de l'utilisateur
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("opr") || ua.includes("opera")) return "opera";
      if (ua.includes("edg")) return "edge";
      if (ua.includes("firefox")) return "firefox";
      if (ua.includes("brave")) return "brave";
    }
    return "opera"; // Opera GX par défaut pour l'utilisateur
  });

  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const browserGuides = {
    opera: {
      name: "Opera GX",
      icon: "🔴",
      url: "opera://settings/system",
      searchUrl: "opera://settings/?search=dns",
      badge: "Votre Navigateur Actuel",
      steps: [
        "Cliquez sur la roue crantée ⚙️ (Réglages) en bas de la barre latérale gauche d'Opera GX (ou faites le raccourci clavier Alt + P).",
        "Dans la barre de recherche des paramètres tout en haut à droite, tapez simplement « DNS ».",
        "Descendez jusqu'à la section « Système » et activez l'interrupteur « Utiliser le DNS sécurisé ».",
        "Sélectionnez « Cloudflare (1.1.1.1) » ou « Google (Public DNS) » dans le menu déroulant.",
        "Revenez sur Erodium et rechargez : tous les lecteurs (VidLink, Vidmoly, Uqload) se débloquent instantanément !",
      ],
    },
    chrome: {
      name: "Google Chrome",
      icon: "🌐",
      url: "chrome://settings/security",
      searchUrl: "chrome://settings/?search=dns",
      steps: [
        "Ouvrez les Paramètres de Chrome (les 3 points verticaux en haut à droite > Paramètres).",
        "Cliquez sur « Confidentialité et sécurité » dans le menu de gauche, puis sur « Sécurité ».",
        "Descendez jusqu'à la section « Paramètres avancés » et repérez « Utiliser un DNS sécurisé ».",
        "Activez l'option, cochez « Avec : » et sélectionnez « Cloudflare (1.1.1.1) » ou « Google (Public DNS) ».",
        "Rechargez Erodium : tous les lecteurs sont instantanément débloqués !",
      ],
    },
    brave: {
      name: "Brave",
      icon: "🦁",
      url: "brave://settings/security",
      searchUrl: "brave://settings/?search=dns",
      steps: [
        "Ouvrez les Paramètres de Brave (menu en haut à droite > Paramètres).",
        "Allez dans « Confidentialité et sécurité » puis « Sécurité ».",
        "Activez « Utiliser un DNS sécurisé ».",
        "Sélectionnez le fournisseur « Cloudflare (1.1.1.1) ».",
        "Rechargez votre page Erodium !",
      ],
    },
    edge: {
      name: "Microsoft Edge",
      icon: "🌊",
      url: "edge://settings/privacy",
      searchUrl: "edge://settings/?search=dns",
      steps: [
        "Ouvrez les Paramètres d'Edge (les 3 points > Paramètres).",
        "Cliquez sur « Confidentialité, recherche et services ».",
        "Dans la section « Sécurité », activez « Utiliser un DNS sécurisé ».",
        "Choisissez « Un fournisseur de services » et sélectionnez « Cloudflare (1.1.1.1) ».",
        "Actualisez Erodium.",
      ],
    },
    firefox: {
      name: "Mozilla Firefox",
      icon: "🦊",
      url: "about:preferences#privacy",
      searchUrl: "about:preferences#privacy",
      steps: [
        "Ouvrez les Paramètres de Firefox (les 3 traits en haut à droite).",
        "Sélectionnez « Vie privée et sécurité ».",
        "Descendez tout en bas jusqu'à la section « DNS via HTTPS ».",
        "Cochez « Protection renforcée » ou « Protection maximale » (Cloudflare est sélectionné par défaut).",
        "Rechargez la vidéo : le blocage FAI disparaît !",
      ],
    },
  };

  const currentGuide = browserGuides[activeTab];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Tutoriel Déblocage FAI (DNS Sécurisé)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  100% Gratuit & Sans VPN
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Débloque définitivement VidLink, Vidmoly, Uqload et tous les lecteurs en 15 secondes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300">
                D'où vient l'erreur « Ce site est inaccessible » / « ERR_NAME_NOT_RESOLVED » ?
              </p>
              <p className="text-zinc-300 leading-relaxed">
                Les 4 grands fournisseurs d'accès internet français (Orange, SFR, Free, Bouygues) bloquent l'adresse de certains lecteurs vidéo directement au niveau de leur serveur DNS. En activant le <strong>DNS Sécurisé (DoH Cloudflare)</strong>, Opera GX interroge directement le réseau mondial chiffré sans passer par le filtre de votre box.
              </p>
            </div>
          </div>

          {/* Browser Selection Tabs */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-2 block flex items-center gap-1.5">
              <span>Sélectionnez votre navigateur :</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(browserGuides).map(([key, guide]) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer relative ${
                      isActive
                        ? "bg-red-600/90 text-white border-red-500 shadow-lg shadow-red-600/25 scale-[1.02]"
                        : "bg-zinc-900 text-zinc-400 border-white/5 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{guide.icon}</span>
                    <span>{guide.name}</span>
                    {key === "opera" && (
                      <span className="text-[9px] px-1 rounded bg-red-400/30 text-white font-extrabold uppercase">
                        Détecté
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps Display */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-white/5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-red-400" />
                <span>Guide pas-à-pas pour {currentGuide.name}</span>
              </span>
              <button
                onClick={() => handleCopy(currentGuide.url)}
                className="text-[11px] text-zinc-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition-colors cursor-pointer"
                title="Copier l'adresse des paramètres"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copié !" : "Copier le lien direct"}</span>
              </button>
            </div>

            <ol className="space-y-3 text-xs text-zinc-300 list-none pl-0">
              {currentGuide.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-[11px]">
                    {index + 1}
                  </span>
                  <span className="text-zinc-200 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Shortcut Box */}
          <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span className="text-zinc-300">
                <strong>Raccourci Opera GX :</strong> Tapez <code className="px-1.5 py-0.5 rounded bg-black/50 text-orange-300 font-mono">Alt + P</code> puis tapez <em>DNS</em> dans la recherche.
              </span>
            </div>
            <button
              onClick={() => handleCopy("opera://settings/system")}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-[11px] whitespace-nowrap cursor-pointer transition-colors shadow-sm"
            >
              Copier l'URL
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-400">
            Une fois activé, cela fonctionne pour tout Opera GX et tous les lecteurs.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all cursor-pointer"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
}
