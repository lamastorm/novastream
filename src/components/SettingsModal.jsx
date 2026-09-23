import React, { useState } from "react";
import {
  X,
  Key,
  Trash2,
  Shield,
  Check,
  ExternalLink,
} from "lucide-react";
import { setCustomApiKey } from "../api/tmdb";
import { storage } from "../services/storage";

export default function SettingsModal({ onClose, onDataCleared }) {
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("erodium_tmdb_key") ||
    localStorage.getItem("novastream_tmdb_key") ||
    ""
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    setCustomApiKey(apiKey);
    localStorage.setItem("erodium_tmdb_key", apiKey.trim());
    localStorage.setItem("novastream_tmdb_key", apiKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.reload();
    }, 1000);
  };

  const handleClearHistory = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider votre historique ?")) {
      storage.clearHistory();
      if (onDataCleared) onDataCleared();
    }
  };

  const handleClearWatchlist = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider tous vos favoris ?")) {
      storage.clearWatchlist();
      if (onDataCleared) onDataCleared();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg glass rounded-2xl border border-white/10 shadow-2xl z-10 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-400" />
            <span>Paramètres de Erodium</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TMDB API Key Section */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs uppercase font-bold text-zinc-400 mb-1">
              Clé API Personnelle TMDB (Optionnel)
            </label>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Une clé publique par défaut est déjà configurée. Vous pouvez
              renseigner votre propre clé TMDB gratuite pour éviter tout quota.
            </p>
          </div>

          <form onSubmit={handleSaveKey} className="flex gap-2">
            <input
              type="text"
              placeholder="Collez votre clé API TMDB ici..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/30"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistré</span>
                </>
              ) : (
                <span>Sauvegarder</span>
              )}
            </button>
          </form>

          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:underline"
          >
            <span>Obtenir une clé gratuite sur themoviedb.org</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>


        {/* Storage Management */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <label className="block text-xs uppercase font-bold text-zinc-400">
            Données Locales
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleClearWatchlist}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Vider les Favoris</span>
            </button>
            <button
              onClick={handleClearHistory}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Vider l'Historique</span>
            </button>
          </div>
        </div>

        {/* Streaming Info & Advice */}
        <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-500/20 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 text-orange-300 font-semibold">
            <Shield className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span>Recommandation de visionnage</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Les lecteurs proviennent d'agrégateurs vidéo publics. Pour une
            meilleure expérience sans redirection publicitaire intempestive, il est
            conseillé d'activer une extension comme <strong>uBlock Origin</strong> ou
            d'utiliser le navigateur <strong>Brave</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
