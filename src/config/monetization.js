// Configuration de monétisation pour Erodium (Affiliation VPN & Dons Bitcoin)

export const MONETIZATION_CONFIG = {
  // 1. Partenariat d'affiliation VPN officiel
  vpn: {
    enabled: true,
    name: "NordVPN",
    badge: "Offre Spéciale : Jusqu'à -74% + 3 mois offerts",
    title: "Offre Partenaire NordVPN : Jusqu'à -74% + 3 mois offerts",
    description: "Sécurisez votre streaming en très haut débit avec le protocole ultra-rapide NordLynx. Contournez les blocages des FAI (Orange, Free, SFR, Bouygues), évitez le bridage de débit et profitez d'une protection complète sur tous vos appareils.",
    features: [
      "Jusqu'à -74% de remise immédiate + 3 mois offerts",
      "Technologie NordLynx ultra-rapide (Streaming 4K sans coupure)",
      "Protection Anti-menaces & bloqueur de pubs / malwares",
      "Garantie satisfait ou remboursé 30 jours",
      "10 appareils protégés en même temps (PC, Mobile, TV, Console)"
    ],
    affiliateUrl: "https://go.nordvpn.net/aff_c?offer_id=15&aff_id=157382",
    ctaText: "Obtenir NordVPN (-74% + 3 mois)",
    shortBadge: "NordVPN (-74%)",
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
