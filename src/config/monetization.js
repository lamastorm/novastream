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
        id: "usdt_trc20",
        coin: "USDT (TRC-20)",
        network: "TRON",
        address: "TYourTronAddressHereXXXXXXXXXXXXXXX", // Remplacez par votre adresse USDT TRC20
        tag: "Recommandé (Frais minimes < 1$)",
        color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
      },
      {
        id: "btc",
        coin: "Bitcoin (BTC)",
        network: "Bitcoin Native",
        address: "bc1qYourBitcoinAddressHereXXXXXXXXXXXX", // Remplacez par votre adresse BTC
        tag: "Standard",
        color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
      },
      {
        id: "sol",
        coin: "Solana (SOL)",
        network: "Solana",
        address: "YourSolanaAddressHereXXXXXXXXXXXXXXXXXX", // Remplacez par votre adresse SOL
        tag: "Ultra-rapide & quasi 0 frais",
        color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
      },
      {
        id: "eth",
        coin: "Ethereum (ETH / ERC-20)",
        network: "Ethereum",
        address: "0xYourEthereumAddressHereXXXXXXXXXXXXXXX", // Remplacez par votre adresse ETH
        tag: "ETH & tokens ERC-20",
        color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
      },
      {
        id: "xmr",
        coin: "Monero (XMR)",
        network: "Monero",
        address: "4YourMoneroAddressHereXXXXXXXXXXXXXXXXX", // Remplacez par votre adresse XMR
        tag: "100% Anonyme",
        color: "text-orange-400 border-orange-500/40 bg-orange-500/10",
      },
    ],
  },
};
