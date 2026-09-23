// Service Anti-Pub & Anti-Popup Erodium
// Spécialement optimisé pour téléphones (iOS / Android) et consoles (Xbox, PlayStation, TV)

class AdBlockerService {
  constructor() {
    this.isEnabled = localStorage.getItem("erodium_antibouclier") !== "false";
    this.strictMode = localStorage.getItem("erodium_strict_popups") === "true";
    this.blockedCount = 0;
    this.listeners = new Set();
    this.lastInteractionTime = 0;
  }

  init() {
    if (typeof window === "undefined") return;

    // Dummy mock window object returned to fooling ad scripts so they don't crash
    // and don't attempt aggressive alternative redirection loops
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
        console.warn("[Erodium Anti-Pub] Pop-up publicitaire neutralisé :", url);
        this.showToast("🛡️ Pop-up publicitaire bloqué");
        return dummyWindow;
      };
    } catch (e) {
      console.error("Erreur init window.open trap", e);
    }

    // 2. Empêcher les tentatives de redirection forcée vers des pages publicitaires
    window.addEventListener("beforeunload", (e) => {
      if (this.isEnabled) {
        delete e["returnValue"];
      }
    });

    // 3. Suivi des interactions tactiles / manettes pour verrouiller le focus Erodium
    window.addEventListener(
      "pointerdown",
      () => {
        this.lastInteractionTime = Date.now();
      },
      { passive: true, capture: true }
    );

    // Si une popup ou redirection dérobe le focus de l'écran lors d'un tap sur le lecteur
    window.addEventListener("blur", () => {
      if (this.isEnabled && Date.now() - this.lastInteractionTime < 1800) {
        setTimeout(() => {
          try {
            window.focus();
          } catch {}
        }, 60);
      }
    });

    console.log("[Erodium Anti-Pub] Bouclier anti-pub et anti-redirection actif.");
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
   * Retourne la politique Sandbox stricte pour l'iframe vidéo :
   * - EXCLUT STRICTEMENT "allow-top-navigation" et "allow-top-navigation-by-user-activation" !
   * - L'iframe ne peut JAMAIS rediriger Erodium vers un autre site (ex: Wyylde ou faux Opera).
   */
  getSandboxString(isStrict = false) {
    if (!this.isEnabled) {
      return "allow-scripts allow-same-origin allow-forms allow-presentation allow-popups";
    }

    if (isStrict || this.strictMode) {
      // Mode Ultra-Strict : Zéro Pop-up, Zéro nouvel onglet
      return "allow-scripts allow-same-origin allow-forms allow-presentation";
    }

    // Mode Standard (Recommandé) :
    // Autorise scripts, plein écran, DRM et sessions internes du lecteur
    // MAIS INTERDIT STRICTEMENT la redirection de la page mère Erodium !
    return "allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox";
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
