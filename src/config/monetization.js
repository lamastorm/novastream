// Configuration de monétisation pour Erodium (Affiliation VPN & Dons Bitcoin)

export const MONETIZATION_CONFIG = {
  // 1. Partenariat d'affiliation VPN
  vpn: {
    enabled: true,
    name: "CyberGhost VPN",
    badge: "Offre Partenaire : -83% + 3 mois offerts",
    title: "Protégez votre streaming et débloquez 100% du catalogue",
    description: "Masquez votre adresse IP, contournez les blocages de vos fournisseurs d'accès (Orange, Free, SFR, Bouygues) et profitez d'une bande passante ultra-rapide sans limite de débit.",
    features: [
      "Zéro journal d'activité (No-Log vérifié)",
      "Débit optimal sans mise en mémoire tampon",
      "Compatible PC, Mac, TV, Xbox, PlayStation et Mobile"
    ],
    // Remplacez ce lien par votre propre lien d'affiliation VPN
    affiliateUrl: "https://www.cyberghostvpn.com/",
    ctaText: "Sécuriser ma connexion (-83%)",
  },

  // 2. Dons et Soutien des serveurs (100% Bitcoin)
  donations: {
    enabled: true,
    title: "Soutenir Erodium",
    subtitle: "100% indépendant • 0 Pub • 100% Gratuit",
    description: "Erodium refuse catégoriquement les publicités intrusives, les trackers et les redirections. Vos dons en Bitcoin financent directement les serveurs d'encodage, les proxys et la bande passante.",
    
    // Suivi d'objectif mensuel
    monthlyGoal: {
      targetEuros: 120,
      currentEuros: 0,
      currency: "€",
    },

    // Moyen de don unique : Bitcoin
    bitcoin: {
      coin: "Bitcoin (BTC)",
      network: "Réseau Bitcoin Native (SegWit)",
      address: "bc1qj2jn0hjcsn964w72tp3690ygxg5hc9pj0u5trr",
      tag: "Paiement Officiel 100% Sécurisé",
    },
  },
};
