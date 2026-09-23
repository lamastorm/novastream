// Service de navigation à la manette (Xbox, PlayStation) et télécommande TV (Spatial Navigation)

class GamepadService {
  constructor() {
    this.isActive = false;
    this.animationFrameId = null;
    this.lastButtonPress = 0;
    this.debounceMs = 200; // anti-rebond pour manette
    this.callbacks = {
      onBack: null,
      onTabNext: null,
      onTabPrev: null,
      onSurprise: null,
    };
    this.gamepadConnected = false;
  }

  init(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };

    if (typeof window === "undefined") return;

    window.addEventListener("gamepadconnected", (e) => {
      this.gamepadConnected = true;
      console.log(`[Erodium Gamepad] Manette connectée : ${e.gamepad.id}`);
      this.showGamepadToast(`🎮 Manette connectée : ${e.gamepad.id.split("(")[0] || "Contrôleur Xbox / TV"}`);
      this.startPolling();
    });

    window.addEventListener("gamepaddisconnected", () => {
      this.gamepadConnected = false;
      console.log("[Erodium Gamepad] Manette déconnectée");
      this.stopPolling();
    });

    // Écouter les touches télécommande TV (D-Pad, Retour, Entrée)
    window.addEventListener("keydown", (e) => this.handleKeyboardTvNav(e));

    // Si une manette est déjà branchée au démarrage
    if (navigator.getGamepads && navigator.getGamepads().length > 0) {
      const anyPad = Array.from(navigator.getGamepads()).find(Boolean);
      if (anyPad) {
        this.gamepadConnected = true;
        this.startPolling();
      }
    }
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  showGamepadToast(message) {
    let toast = document.getElementById("erodium-gamepad-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "erodium-gamepad-toast";
      toast.className =
        "fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-zinc-950/95 border border-orange-500/60 text-white font-bold text-xs shadow-2xl shadow-orange-500/20 flex items-center gap-2 animate-fade-in pointer-events-none";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = "flex";
    setTimeout(() => {
      if (toast) toast.style.display = "none";
    }, 3500);
  }

  startPolling() {
    if (this.isActive) return;
    this.isActive = true;

    const poll = () => {
      if (!this.isActive) return;

      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = Array.from(gamepads).find(Boolean);

      if (pad) {
        this.handleGamepadInput(pad);
      }

      this.animationFrameId = requestAnimationFrame(poll);
    };

    this.animationFrameId = requestAnimationFrame(poll);
  }

  stopPolling() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  handleGamepadInput(pad) {
    const now = Date.now();
    if (now - this.lastButtonPress < this.debounceMs) return;

    // Boutons Xbox / PlayStation standards
    const bA = pad.buttons[0]?.pressed; // A (Xbox) / Croix (PS) -> Valider / Cliquer
    const bB = pad.buttons[1]?.pressed; // B (Xbox) / Rond (PS) -> Retour / Fermer
    const bX = pad.buttons[2]?.pressed; // X (Xbox) / Carré (PS) -> Surprenez-moi
    const bY = pad.buttons[3]?.pressed; // Y (Xbox) / Triangle (PS) -> Plein Écran
    const bLB = pad.buttons[4]?.pressed; // LB (Gâche haut gauche) -> Onglet précédent
    const bRB = pad.buttons[5]?.pressed; // RB (Gâche haut droite) -> Onglet suivant

    // D-Pad croix directionnelle
    const dUp = pad.buttons[12]?.pressed || pad.axes[1] < -0.5;
    const dDown = pad.buttons[13]?.pressed || pad.axes[1] > 0.5;
    const dLeft = pad.buttons[14]?.pressed || pad.axes[0] < -0.5;
    const dRight = pad.buttons[15]?.pressed || pad.axes[0] > 0.5;

    if (bA) {
      this.lastButtonPress = now;
      const focused = document.activeElement;
      if (focused && typeof focused.click === "function") {
        focused.click();
      }
      return;
    }

    if (bB) {
      this.lastButtonPress = now;
      if (this.callbacks.onBack) {
        this.callbacks.onBack();
      }
      return;
    }

    if (bLB) {
      this.lastButtonPress = now;
      if (this.callbacks.onTabPrev) this.callbacks.onTabPrev();
      return;
    }

    if (bRB) {
      this.lastButtonPress = now;
      if (this.callbacks.onTabNext) this.callbacks.onTabNext();
      return;
    }

    if (bX) {
      this.lastButtonPress = now;
      if (this.callbacks.onSurprise) this.callbacks.onSurprise();
      return;
    }

    if (bY) {
      this.lastButtonPress = now;
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }

    if (dUp) {
      this.lastButtonPress = now;
      this.navigateDirection("up");
      return;
    }

    if (dDown) {
      this.lastButtonPress = now;
      this.navigateDirection("down");
      return;
    }

    if (dLeft) {
      this.lastButtonPress = now;
      this.navigateDirection("left");
      return;
    }

    if (dRight) {
      this.lastButtonPress = now;
      this.navigateDirection("right");
      return;
    }
  }

  // Navigation Spatial pour D-Pad Télécommande TV et Clavier Arrow
  handleKeyboardTvNav(e) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const dirMap = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      this.navigateDirection(dirMap[e.key]);
    }
  }

  // Calcul géométrique du voisin le plus proche dans la direction demandée
  navigateDirection(direction) {
    const focusableElements = Array.from(
      document.querySelectorAll(
        '[data-focusable="true"], a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== "hidden";
    });

    if (focusableElements.length === 0) return;

    const current = document.activeElement;
    if (!current || !focusableElements.includes(current)) {
      focusableElements[0].focus();
      focusableElements[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestElement = null;
    let minDistance = Infinity;

    for (const el of focusableElements) {
      if (el === current) continue;

      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      // Filtrer selon la direction demandée
      let isValidDir = false;
      let primaryWeight = 1;
      let secondaryWeight = 2.5; // pénaliser les déviations transversales

      if (direction === "right" && dx > 15) {
        isValidDir = true;
      } else if (direction === "left" && dx < -15) {
        isValidDir = true;
      } else if (direction === "down" && dy > 15) {
        isValidDir = true;
        primaryWeight = 1;
        secondaryWeight = 3;
      } else if (direction === "up" && dy < -15) {
        isValidDir = true;
        primaryWeight = 1;
        secondaryWeight = 3;
      }

      if (isValidDir) {
        const dist =
          direction === "left" || direction === "right"
            ? Math.abs(dx) * primaryWeight + Math.abs(dy) * secondaryWeight
            : Math.abs(dy) * primaryWeight + Math.abs(dx) * secondaryWeight;

        if (dist < minDistance) {
          minDistance = dist;
          bestElement = el;
        }
      }
    }

    if (bestElement) {
      bestElement.focus();
      bestElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }
}

export const gamepadService = new GamepadService();
