// Service Anti-Pub & Anti-Redirection Erodium
// Inspiré des meilleures passerelles de streaming propres (Domgrav, Anime-Sama)
// Optimisé pour téléphones (iOS / Android), consoles (Xbox, PlayStation) et TV

class AdBlockerService {
  constructor() {
    this.isEnabled = localStorage.getItem("erodium_antibouclier") !== "false";
    this.strictMode = localStorage.getItem("erodium_strict_popups") === "true";
    this.blockedCount = 0;
    this.listeners = new Set();
    this.lastInteractionTime = 0;
    this.isPlayerActive = false;
    this.isLegitNav = false;
  }

  init() {
    if (typeof window === "undefined") return;

    // Objet fenêtre factice (Dummy Window Proxy) pour tromper les scripts de pub
    // afin qu'ils n'essayent pas de boucles de redirection alternatives violentes
    const dummyWindow = {
      closed: false,
      close: () => {},
      focus: () => {},
      blur: () => {},
      postMessage: () => {},
      location: { href: "" },
      document: { write: () => {}, open: () => {}, close: () => {} },
    };

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
        this.showToast("🛡️ Pop-up publicitaire bloqué (Style Domgrav)");
        return dummyWindow;
      };
    } catch (e) {
      console.error("Erreur init window.open trap", e);
    }

    // 2. Interception native des redirections de page via la Navigation API (Chrome, Edge, Xbox, Android)
    // Permet de bloquer à 100% les redirections vers Wyylde ou autres sites sans avoir besoin de sandbox !
    if (typeof window !== "undefined" && window.navigation) {
      try {
        window.navigation.addEventListener("navigate", (event) => {
          if (!this.isEnabled || !this.isPlayerActive || this.isLegitNav) return;
          try {
            const destUrl = event.destination?.url;
            if (!destUrl) return;
            const dest = new URL(destUrl);
            const isInternal =
              dest.origin === window.location.origin ||
              dest.hostname.includes("themoviedb.org") ||
              dest.hostname.includes("youtube.com") ||
              dest.hostname.includes("vercel.app");

            if (!isInternal) {
              console.warn("[Erodium Anti-Pub] Tentative de redirection de page annulée :", destUrl);
              event.preventDefault(); // Annule la redirection top-level !
              this.showToast("🛡️ Redirection publicitaire bloquée");
            }
          } catch (err) {}
        });
      } catch (e) {
        console.error("Erreur Navigation API trap", e);
      }
    }

    // 3. Empêcher les tentatives de redirection forcée vers des pages publicitaires
    window.addEventListener("beforeunload", (e) => {
      if (this.isEnabled && this.isPlayerActive && !this.isLegitNav) {
        delete e["returnValue"];
      }
    });

    // 4. Suivi des interactions tactiles / manettes pour verrouiller le focus Erodium
    window.addEventListener(
      "pointerdown",
      () => {
        this.lastInteractionTime = Date.now();
      },
      { passive: true, capture: true }
    );

    // Si une popup ou redirection tente de dérober le focus de l'écran lors d'un tap sur le lecteur
    window.addEventListener("blur", () => {
      if (this.isEnabled && this.isPlayerActive && Date.now() - this.lastInteractionTime < 2200) {
        setTimeout(() => {
          try {
            window.focus();
          } catch {}
        }, 60);
      }
    });

    console.log("[Erodium Anti-Pub] Bouclier anti-pub actif (mode propre style Domgrav).");
  }

  setPlayerActive(active) {
    this.isPlayerActive = !!active;
  }

  setLegitNav(val) {
    this.isLegitNav = !!val;
  }

  setEnabled(val) {
    this.isEnabled = !!val;
    localStorage.setItem("erodium_antibouclier", this.isEnabled ? "true" : "false");
    this.notifyListeners("toggle", this.isEnabled);
  }

  setStrictMode(val) {
    this.strictMode = !!val;
    localStorage.setItem("erodium_strict_popups", this.strictMode ? "true" : "false");
    this.notifyListeners("strictToggle", this.strictMode);
  }

  /**
   * Retourne la politique Sandbox pour l'iframe vidéo :
   * NOTE : De nombreux hébergeurs (AutoEmbed, VidSrc) bloquent la lecture avec "Playback blocked"
   * s'ils détectent l'attribut sandbox.
   * Par défaut, on ne met PAS de sandbox sur l'iframe pour éviter cette détection,
   * et on neutralise les pubs via l'interception de window.open, le focus lock et la Navigation API.
   */
  getSandboxString(isStrict = false) {
    if (!this.isEnabled) {
      return undefined;
    }

    // Uniquement si l'utilisateur coche expressément le mode strict
    if (isStrict === true && this.strictMode === true) {
      return "allow-scripts allow-same-origin allow-forms allow-presentation";
    }

    return undefined;
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
