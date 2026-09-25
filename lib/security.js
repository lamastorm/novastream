// Middleware de sécurité, anti-scraping et protection anti-DDoS pour Erodium API

const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 90; // 90 requêtes max par minute par IP

const BLOCKED_USER_AGENTS = [
  /python-requests/i,
  /aiohttp/i,
  /scrapy/i,
  /sqlmap/i,
  /nikto/i,
  /wpscan/i,
  /go-http-client/i,
  /postmanruntime/i,
  /insomnia/i,
  /curl\//i,
  /wget\//i,
  /libwww-perl/i,
  /masscan/i,
  /zgrab/i,
];

/**
 * Applique les filtres de sécurité sur les requêtes API
 * Retourne false si la requête est bloquée
 */
export function applySecurity(req, res) {
  // En-têtes de sécurité stricts
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Identification de l'IP du client (compatible proxy Vercel & Cloudflare)
  const cfIp = req.headers["cf-connecting-ip"];
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof cfIp === "string" 
    ? cfIp 
    : (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : (req.socket?.remoteAddress || "unknown"));

  // 1. Filtrage User-Agent suspect / outils de scraping automatisés
  const ua = req.headers["user-agent"] || "";
  for (const pattern of BLOCKED_USER_AGENTS) {
    if (pattern.test(ua)) {
      res.status(403).json({ 
        error: "Accès refusé. Les outils de scraping et requêtes automatisées sont interdits sur Erodium." 
      });
      return false;
    }
  }

  // 2. Nettoyage paresseux de la mémoire si la Map devient volumineuse (évite setInterval persistant)
  const now = Date.now();
  if (rateLimitMap.size > 500) {
    for (const [k, d] of rateLimitMap.entries()) {
      if (now - d.resetTime > WINDOW_MS) {
        rateLimitMap.delete(k);
      }
    }
  }

  // Rate Limiting par adresse IP
  const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now };

  if (now - clientData.resetTime > WINDOW_MS) {
    clientData.count = 1;
    clientData.resetTime = now;
  } else {
    clientData.count++;
  }
  rateLimitMap.set(ip, clientData);

  if (clientData.count > MAX_REQUESTS) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ 
      error: "Trop de requêtes. Veuillez patienter une minute avant de réessayer." 
    });
    return false;
  }

  // 3. Assainissement et limitation de longueur des paramètres d'entrée
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string" && v.length > 200) {
        req.query[k] = v.slice(0, 200);
      }
    }
  }

  return true;
}

/**
 * Protection spécifique pour le proxy HLS vidéo (sans rate limit strict sur les chunks .ts)
 */
export function applyHlsSecurity(req, res, targetUrl) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  const ua = req.headers["user-agent"] || "";
  for (const pattern of BLOCKED_USER_AGENTS) {
    if (pattern.test(ua)) {
      res.status(403).send("Accès refusé.");
      return false;
    }
  }

  // Vérification SSRF : seules les URLs https:// ou http:// publiques valides sont acceptées
  if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
    res.status(400).send("URL invalide.");
    return false;
  }

  // Interdiction des adresses locales / internes (protection SSRF)
  const lower = targetUrl.toLowerCase();
  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("192.168.") ||
    lower.includes("10.") ||
    lower.includes("169.254.") ||
    lower.includes("metadata.google")
  ) {
    res.status(403).send("Accès interdit vers cette destination.");
    return false;
  }

  return true;
}
