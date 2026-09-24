// Configuration de monétisation pour Erodium (Affiliation VPN & Dons)
// Vous pouvez modifier vos liens d'affiliation et vos adresses de portefeuilles crypto ici directement.

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
    // Remplacez ce lien par votre propre lien d'affiliation VPN (ex: affilié CyberGhost, NordVPN, Surfshark)
    affiliateUrl: "https://www.cyberghostvpn.com/",
    ctaText: "Sécuriser ma connexion (-83%)",
  },

  // 2. Dons et Soutien des serveurs
  donations: {
    enabled: true,
    title: "Soutenir Erodium",
    subtitle: "100% indépendant • 0 Pub • 100% Gratuit",
    description: "Erodium refuse catégoriquement les publicités intrusives, les trackers et les redirections trompeuses. Vos dons permettent de payer les serveurs, la bande passante et le maintien du catalogue à jour chaque jour.",
    
    // Suivi d'objectif mensuel pour motiver la communauté
    monthlyGoal: {
      targetEuros: 120,
      currentEuros: 48,
      currency: "€",
    },

    // Liens fiat (carte bancaire, Ko-fi, PayPal, etc.)
    fiatLinks: [
      {
        id: "kofi",
        name: "Ko-fi / Carte Bancaire",
        desc: "Faire un don rapide en CB sans inscription",
        url: "https://ko-fi.com/", // Remplacez par votre page Ko-fi ou BuyMeACoffee
        color: "bg-emerald-600 hover:bg-emerald-500",
      },
    ],

    // Adresses de portefeuilles Crypto (anonymes, sans risque de blocage de compte)
    cryptoWallets: [
      {
        id: "btc",
        coin: "Bitcoin (BTC)",
        network: "Bitcoin Native (SegWit)",
        address: "bc1qj2jn0hjcsn964w72tp3690ygxg5hc9pj0u5trr",
        tag: "Principal",
        color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
      },
    ],
  },
};
