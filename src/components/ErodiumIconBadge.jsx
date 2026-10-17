import React from "react";

/**
 * Logos personnalisés Erodium (Style Néon Orange -> Rose -> Violet)
 * Mode "badge" : Losange/parallélogramme incliné avec contour néon lumineux et icône 3D dégradée (Image 1)
 * Mode "inline" : Icône vectorielle dégradée ou blanche pour la barre de navigation (Image 2)
 */
export default function ErodiumIconBadge({
  type = "home",
  variant = "badge", // "badge" | "inline"
  active = false,
  size = "md", // "sm" | "md" | "lg"
  className = "",
}) {
  const gradId = `erodium-grad-${type}-${variant}-${Math.random().toString(36).slice(2, 7)}`;
  const borderGradId = `erodium-bgrad-${type}-${variant}-${Math.random().toString(36).slice(2, 7)}`;

  const renderGlyph = (isWhite = false) => {
    const fillUrl = isWhite ? "#ffffff" : `url(#${gradId})`;
    const strokeUrl = isWhite ? "#ffffff" : `url(#${gradId})`;

    switch (type) {
      case "home":
        // Maison néon dégradée (Image 1 #1)
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb703" />
                <stop offset="48%" stopColor="#ff2a85" />
                <stop offset="100%" stopColor="#7209b7" />
              </linearGradient>
            </defs>
            <path
              d="M16 4.2L3.5 15.2c-.6.5-.2 1.5.6 1.5H7v9.8c0 1.1.9 2 2 2h4.6v-6.8c0-.8.6-1.4 1.4-1.4h2c.8 0 1.4.6 1.4 1.4v6.8H23c1.1 0 2-.9 2-2v-9.8h2.9c.8 0 1.2-1 .6-1.5L16 4.2z"
              fill={fillUrl}
              style={{
                filter: isWhite
                  ? "drop-shadow(0 1px 4px rgba(255,255,255,0.4))"
                  : "drop-shadow(0 2px 6px rgba(255, 42, 133, 0.45))",
              }}
            />
          </svg>
        );

      case "movies":
        // Clap de cinéma ouvert avec triangle Play (Image 1 #2)
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb703" />
                <stop offset="50%" stopColor="#ff2a85" />
                <stop offset="100%" stopColor="#7209b7" />
              </linearGradient>
            </defs>
            {/* Partie supérieure inclinée du clap avec bandes */}
            <path
              d="M5.2 9.2L24.8 4.4c1.1-.3 2.2.4 2.5 1.5l.6 2.5-22.2 5.4-.6-2.4c-.3-1 .3-1.9 1.1-2.2z"
              fill={fillUrl}
            />
            <path
              d="M9.5 8.1l2.2 3.2M15.5 6.7l2.2 3.2M21.5 5.2l2.2 3.2"
              stroke="#0a0514"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Corps du clap avec bouton Play découpé */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5 14.2h22c1.1 0 2 .9 2 2v9.3c0 1.4-1.1 2.5-2.5 2.5h-21C4.1 28 3 26.9 3 25.5v-9.3c0-1.1.9-2 2-2zm8.8 3.6c-.5-.3-1.1.1-1.1.7v5.4c0 .6.6 1 1.1.7l4.8-2.7c.5-.3.5-1 0-1.4l-4.8-2.7z"
              fill={fillUrl}
              style={{
                filter: isWhite
                  ? "drop-shadow(0 1px 4px rgba(255,255,255,0.4))"
                  : "drop-shadow(0 2px 6px rgba(255, 42, 133, 0.45))",
              }}
            />
          </svg>
        );

      case "series":
        // Téléviseur rétro avec antennes et bouton Play central (Image 1 #3)
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb703" />
                <stop offset="50%" stopColor="#ff2a85" />
                <stop offset="100%" stopColor="#7209b7" />
              </linearGradient>
            </defs>
            {/* Antennes */}
            <path
              d="M11.2 4.5L15.6 9h.8l4.4-4.5"
              fill="none"
              stroke={strokeUrl}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cadre TV */}
            <rect
              x="4"
              y="9.2"
              width="24"
              height="17.5"
              rx="4.5"
              fill="none"
              stroke={strokeUrl}
              strokeWidth="2.8"
            />
            {/* Pieds TV */}
            <path
              d="M9.5 27.2h3M19.5 27.2h3"
              stroke={strokeUrl}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {/* Triangle Play central */}
            <path
              d="M13.5 14.3c-.5-.3-1.2.1-1.2.7v6c0 .6.7 1 1.2.7l5.3-3c.5-.3.5-1.1 0-1.4l-5.3-3z"
              fill={fillUrl}
            />
          </svg>
        );

      case "anime":
        // Manette Gaming / Otaku avec croix directionnelle et 4 boutons (Image 1 #4)
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb703" />
                <stop offset="50%" stopColor="#ff2a85" />
                <stop offset="100%" stopColor="#7209b7" />
              </linearGradient>
            </defs>
            {/* Contour de la manette */}
            <path
              d="M9.2 10h13.6c3.1 0 5.6 2.3 6.1 5.4l.8 5.2c.4 2.7-1.7 5.1-4.4 5.1-1.4 0-2.7-.6-3.6-1.7l-1.6-2c-.4-.5-1-.8-1.7-.8h-4.8c-.7 0-1.3.3-1.7.8l-1.6 2c-.9 1.1-2.2 1.7-3.6 1.7-2.7 0-4.8-2.4-4.4-5.1l.8-5.2C3.6 12.3 6.1 10 9.2 10z"
              fill="none"
              stroke={strokeUrl}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Croix D-Pad gauche */}
            <path
              d="M10.5 14.2v4.6M8.2 16.5h4.6"
              stroke={strokeUrl}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* 4 boutons droite */}
            <circle cx="21.5" cy="14.2" r="1.2" fill={fillUrl} />
            <circle cx="21.5" cy="18.8" r="1.2" fill={fillUrl} />
            <circle cx="19.2" cy="16.5" r="1.2" fill={fillUrl} />
            <circle cx="23.8" cy="16.5" r="1.2" fill={fillUrl} />
          </svg>
        );

      case "favorites":
        // Étoile 5 branches arrondie en dégradé (Image 1 #5)
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb703" />
                <stop offset="50%" stopColor="#ff2a85" />
                <stop offset="100%" stopColor="#7209b7" />
              </linearGradient>
            </defs>
            <path
              d="M16 3.8c.5 0 1 .3 1.2.8l3.1 6.4 7 .9c1 .1 1.4 1.4.7 2.1l-5.1 4.9 1.3 7c.2 1-.9 1.8-1.8 1.3L16 23.8l-6.4 3.4c-.9.5-2-.3-1.8-1.3l1.3-7-5.1-4.9c-.7-.7-.3-2 .7-2.1l7-.9 3.1-6.4c.2-.5.7-.8 1.2-.8z"
              fill={fillUrl}
              style={{
                filter: isWhite
                  ? "drop-shadow(0 1px 4px rgba(255,255,255,0.4))"
                  : "drop-shadow(0 2px 6px rgba(255, 42, 133, 0.45))",
              }}
            />
          </svg>
        );

      default:
        return null;
    }
  };

  if (variant === "inline") {
    const dim = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
    return (
      <span className={`inline-flex items-center justify-center flex-shrink-0 ${dim} ${className}`}>
        {renderGlyph(active)}
      </span>
    );
  }

  // Variant "badge" : Losange incliné (skew) avec cadre néon orange-rose-violet (Image 1)
  const boxSizes = {
    sm: "w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-[1.5px]",
    md: "w-9 h-8 sm:w-10 sm:h-9 rounded-xl p-[1.5px]",
    lg: "w-12 h-11 rounded-2xl p-[2px]",
  };

  const innerIconSizes = {
    sm: "w-4 h-4 sm:w-4.5 sm:h-4.5",
    md: "w-5 h-5 sm:w-5.5 sm:h-5.5",
    lg: "w-7 h-7",
  };

  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 -skew-x-12 transition-all duration-300 ${
        boxSizes[size] || boxSizes.md
      } ${
        active
          ? "shadow-[0_0_20px_rgba(255,123,0,0.7),0_0_25px_rgba(168,85,247,0.65)] scale-105"
          : "shadow-[0_0_12px_rgba(255,123,0,0.3),0_0_16px_rgba(139,92,246,0.3)] group-hover:shadow-[0_0_18px_rgba(255,123,0,0.55),0_0_22px_rgba(168,85,247,0.55)]"
      } ${className}`}
      style={{
        background:
          "linear-gradient(125deg, #ff9e00 0%, #ff2a85 48%, #7209b7 100%)",
      }}
    >
      {/* Intérieur sombre vitré avec reflet néon */}
      <span className="w-full h-full rounded-[inherit] bg-[#080312]/95 flex items-center justify-center relative overflow-hidden">
        {/* Lueur latérale gauche orange & droite violette comme sur l'Image 1 */}
        <span
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{
            background:
              "radial-gradient(circle at 12% 50%, rgba(255,140,0,0.35), transparent 55%), radial-gradient(circle at 88% 50%, rgba(139,92,246,0.35), transparent 55%)",
          }}
        />
        {/* Icône redressée (skew-x-12) */}
        <span className={`skew-x-12 flex items-center justify-center ${innerIconSizes[size] || innerIconSizes.md}`}>
          {renderGlyph(false)}
        </span>
      </span>
    </span>
  );
}
