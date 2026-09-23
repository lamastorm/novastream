// Service de détection et d'adaptation multi-écrans (Mobiles, TV, Xbox, Consoles, PC)

export const deviceAdvisor = {
  /**
   * Détecte si l'appareil est un téléviseur ou une console de salon
   */
  isTV: () => {
    if (typeof window === "undefined" || !navigator.userAgent) return false;
    const ua = navigator.userAgent.toLowerCase();
    return (
      /xbox|playstation|smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast.tv|viera|bravia|tizen|webos|crkey|aft|firetv|roku|shield/i.test(ua) ||
      localStorage.getItem("erodium_tv_mode") === "true"
    );
  },

  /**
   * Détecte spécifiquement Xbox
   */
  isXbox: () => {
    if (typeof window === "undefined" || !navigator.userAgent) return false;
    return /xbox/i.test(navigator.userAgent);
  },

  /**
   * Détecte spécifiquement PlayStation
   */
  isPlayStation: () => {
    if (typeof window === "undefined" || !navigator.userAgent) return false;
    return /playstation/i.test(navigator.userAgent);
  },

  /**
   * Détecte si l'appareil est un mobile ou une tablette tactile
   */
  isMobile: () => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isNarrow = window.innerWidth <= 768;
    return (isMobileUA || (isTouch && isNarrow)) && !deviceAdvisor.isTV();
  },

  /**
   * Active ou désactive manuellement le Mode Télévision (10-Foot UI)
   */
  setTvMode: (enabled) => {
    localStorage.setItem("erodium_tv_mode", enabled ? "true" : "false");
    if (enabled) {
      document.documentElement.classList.add("tv-mode");
    } else {
      document.documentElement.classList.remove("tv-mode");
    }
  },

  /**
   * Vérifie si le mode TV est actuellement actif
   */
  getTvMode: () => {
    return deviceAdvisor.isTV();
  },

  /**
   * Applique la classe tv-mode au document si applicable
   */
  applyMode: () => {
    if (typeof document === "undefined") return;
    if (deviceAdvisor.isTV()) {
      document.documentElement.classList.add("tv-mode");
    } else {
      document.documentElement.classList.remove("tv-mode");
    }
  },
};
