import React, { useState } from "react";
import { X, CheckCircle2, Tv, LogOut, RefreshCw, Loader2, ShieldCheck, Mail } from "lucide-react";
import { storage } from "../services/storage";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState("google"); // "google" | "pin"
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const currentUser = storage.getUser();

  if (!isOpen) return null;

  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Veuillez entrer votre adresse Google (ex: votrenom@gmail.com).");
      return;
    }

    setLoading(true);
    try {
      const user = await storage.loginAndSync({
        email: cleanEmail,
        name: name.trim() || cleanEmail.split("@")[0],
      });
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (err) {
      setError(err.message || "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const cleanPin = pin.trim();
    if (cleanPin.length < 4) {
      setError("Veuillez entrer le code à 4 chiffres affiché sur votre PC ou téléphone.");
      return;
    }

    setLoading(true);
    try {
      const user = await storage.loginAndSync({ pin: cleanPin });
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (err) {
      setError(err.message || "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      storage.pushToCloud({ immediate: true });
      await new Promise((r) => setTimeout(r, 400));
      await storage.pullFromCloud();
      setSyncSuccess(true);
      if (onAuthSuccess) onAuthSuccess(storage.getUser());
      setTimeout(() => setSyncSuccess(false), 2500);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    storage.logout();
    if (onAuthSuccess) onAuthSuccess(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-950 border border-white/15 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.5 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.02 21.17 7.19 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.89 0 11.67s.37 4.22 1.01 5.5l4.01-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.5-3.5C18.07 1.14 15.3 0 12 0 7.19 0 3.02 2.83 1.01 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.98-5.22z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {currentUser ? "Mon Compte Cloud Erodium" : "Connexion Google & Cloud"}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Sauvegarde automatique PC, Téléphone & Xbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentUser ? (
          /* CONNECTED VIEW */
          <div className="pt-5 space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900 border border-white/10">
              <div className="w-11 h-11 rounded-full bg-orange-600 flex items-center justify-center text-white font-black text-base uppercase flex-shrink-0">
                {(currentUser.name || currentUser.email || "E")[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white truncate">
                    {currentUser.name}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                </div>
                <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            {/* XBOX / TV PAIRING CODE */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-orange-500/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                  <Tv className="w-4 h-4" />
                  <span>Code rapide Xbox / TV :</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Entrez ces 4 chiffres sur votre Xbox pour lier votre compte en 2 secondes
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-lg bg-black border border-white/15 font-black text-xl tracking-widest text-white">
                {currentUser.pin || "----"}
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="text-lg font-black text-white">
                  {storage.getWatchlist().length}
                </div>
                <div className="text-[11px] text-zinc-400">Titres en Favoris</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/10">
                <div className="text-lg font-black text-white">
                  {storage.getHistory().length}
                </div>
                <div className="text-[11px] text-zinc-400">Reprises & Historique</div>
              </div>
            </div>

            {syncSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center">
                ✓ Données synchronisées avec le serveur Oracle Cloud !
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Synchronisation..." : "Synchroniser maintenant"}</span>
              </button>

              <button
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN VIEW */
          <div className="pt-4 space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode("google");
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "google"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Compte Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("pin");
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "pin"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Code Xbox (4 chiffres)</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-medium">
                {error}
              </div>
            )}

            {mode === "google" ? (
              <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Adresse Google (Gmail)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Prénom ou Pseudo (optionnel)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre pseudo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.5 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.02 21.17 7.19 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36s.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.89 0 11.67s.37 4.22 1.01 5.5l4.01-3.14z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.5-3.5C18.07 1.14 15.3 0 12 0 7.19 0 3.02 2.83 1.01 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.98-5.22z"
                      />
                    </svg>
                  )}
                  <span>Continuer avec Google</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handlePinSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Code à 4 chiffres (affiché sur votre PC ou téléphone)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Ex: 4829"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/15 text-center text-xl font-black tracking-widest text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Tv className="w-4 h-4" />
                  )}
                  <span>Connecter ma Xbox / TV</span>
                </button>
              </form>
            )}

            <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Vos favoris, votre historique et la minute exacte de vos films sont sauvegardés sur le serveur Oracle.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
