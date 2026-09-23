// Service Anti-Pub & Anti-Popup Erodium
// Conçu spécialement pour téléphones (iOS / Android) et consoles (Xbox, PlayStation, TV)

class AdBlockerService {
  constructor() {
    this.isEnabled = localStorage.getItem("erodium_antibouclier") !== "false";
    this.blockedCount = 0;
    this.listeners = new Set();
  }

  init() {
    if (typeof window === "undefined") return;

    // 1. Interception globale de window.open (anti-popups intempestifs)
    try {
      const originalOpen = window.open;
      window.open = (url, target, features) => {
        if (!this.isEnabled) {
          return originalOpen.call(window, url, target, features);
        }

        // Autoriser uniquement les ouvertures légitimes initiées par Erodium (YouTube, TMDB, Cloudflare)
        if (
          url &&
          (url.includes("youtube.com") ||
            url.includes("themoviedb.org") ||
            url.includes("one.one.one.one") ||
            url.includes("cloudflare.com") ||
            url.startsWith(window.location.origin))
        ) {
          return originalOpen.call(window, url, target, features);
        }

        this.blockedCount++;
        this.notifyListeners("popup", url);
        console.warn("[Erodium Anti-Pub] Pop-up publicitaire bloqué :", url);
        this.showToast("🛡️ Pop-up publicitaire bloqué");
        return null;
      };
    } catch (e) {
      console.error("Erreur init window.open trap", e);
    }

    // 2. Empêcher les tentatives de redirection forcée vers des pages publicitaires
    window.addEventListener("beforeunload", (e) => {
      // Si une pub tente de poser un dialogue de confirmation pour retenir le visiteur
      if (this.isEnabled) {
        delete e["returnValue"];
      }
    });

    console.log("[Erodium Anti-Pub] Bouclier anti-pub et anti-popups activé.");
  }

  setEnabled(val) {
    this.isEnabled = !!val;
    localStorage.setItem("erodium_antibouclier", this.isEnabled ? "true" : "false");
    this.notifyListeners("toggle", this.isEnabled);
  }

  getSandboxString(allowPopupsIfRequested = false) {
    if (!this.isEnabled || allowPopupsIfRequested) {
      return "allow-scripts allow-same-origin allow-forms allow-presentation allow-popups";
    }
    // Mode Strict : Zéro Pop-up, Zéro redirection top-level, Zéro téléchargement automatique
    return "allow-scripts allow-same-origin allow-forms allow-presentation";
  }

  showToast(message) {
    if (typeof document === "undefined") return;
    let toast = document.getElementById("erodium-adblock-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "erodium-adblock-toast";
      toast.className =
        "fixed top-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 font-bold text-xs shadow-2xl shadow-emerald-500/20 flex items-center gap-2 animate-fade-in pointer-events-none transition-opacity duration-300";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> ${message}`;
    toast.style.opacity = "1";
    toast.style.display = "flex";

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      if (toast) {
        toast.style.opacity = "0";
        setTimeout(() => {
          if (toast) toast.style.display = "none";
        }, 300);
      }
    }, 2800);
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyListeners(type, data) {
    this.listeners.forEach((fn) => {
      try {
        fn(type, data);
      } catch (err) {
        console.error(err);
      }
    });
  }
}

export const adBlocker = new AdBlockerService();
