import https from 'https';

function fetchText(url, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        return fetchText(redirectUrl, timeoutMs).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, url }));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });

    req.on('error', reject);
  });
}

function parseAnimeCards(html) {
  const cards = [];
  const cardRegex = /<a[^>]+href=["'](https?:\/\/anime-sama\.(?:to|si)\/catalogue\/([a-zA-Z0-9_\-]+)\/?|\/catalogue\/([a-zA-Z0-9_\-]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  
  for (const match of html.matchAll(cardRegex)) {
    const slug = match[2] || match[3];
    if (!slug || slug === 'catalogue' || slug === 'search') continue;

    const inner = match[4];
    const titleMatch = inner.match(/<h2[^>]*class=["'][^"']*card-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i);
    const altMatch = inner.match(/<p[^>]*class=["'][^"']*alternate-titles[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    
    const cardTitle = titleMatch ? titleMatch[1].trim() : slug;
    const altTitles = altMatch ? altMatch[1].split(',').map(s => s.trim()) : [];

    cards.push({
      slug,
      title: cardTitle,
      altTitles
    });
  }
  return cards;
}

function findBestCard(cards, query) {
  if (!cards || cards.length === 0) return null;
  const cleanQ = query.toLowerCase().trim();
  const slugQ = cleanQ.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

  let best = null;
  let maxScore = -1;

  for (const card of cards) {
    let score = 0;
    const cardTitle = card.title.toLowerCase();
    const cardSlug = card.slug.toLowerCase();
    const altTitles = card.altTitles.map(t => t.toLowerCase());

    if (cardSlug === slugQ) score += 1000;
    if (cardTitle === cleanQ) score += 1000;
    if (altTitles.includes(cleanQ)) score += 800;

    if (cardTitle.startsWith(cleanQ)) score += 500;
    if (cardSlug.startsWith(slugQ)) score += 400;

    if (cardTitle.includes(cleanQ)) score += 200;
    if (altTitles.some(t => t.includes(cleanQ))) score += 150;

    if (cardSlug.includes('junior') && !slugQ.includes('junior')) score -= 300;
    if (cardSlug.includes('cultivator') && !slugQ.includes('cultivator')) score -= 400;
    if (cardSlug.includes('spinoff') && !slugQ.includes('spinoff')) score -= 300;

    if (score > 0) {
      score += Math.max(0, 100 - Math.abs(cardSlug.length - slugQ.length) * 2);
    }

    if (score > maxScore) {
      maxScore = score;
      best = card;
    }
  }

  return best || cards[0];
}

export async function resolveAnimeSama({ title, season = 1, episode = 1, lang = 'vf' }) {
  if (!title) return { success: false, error: 'Paramètre "title" manquant' };

  // Base domain with fallback
  const baseDomains = ['https://anime-sama.to', 'https://anime-sama.si'];
  let primaryBase = baseDomains[0];

  try {
    // 1. Search anime catalog
    let searchRes;
    try {
      searchRes = await fetchText(`${primaryBase}/catalogue/?search=${encodeURIComponent(title)}`);
    } catch {
      primaryBase = baseDomains[1];
      searchRes = await fetchText(`${primaryBase}/catalogue/?search=${encodeURIComponent(title)}`);
    }

    const cards = parseAnimeCards(searchRes.body);
    let chosenCard = findBestCard(cards, title);

    let chosenSlug = chosenCard ? chosenCard.slug : null;
    if (!chosenSlug) {
      // Fallback slug generation
      chosenSlug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }

    // 2. Fetch anime page to find season paths
    const animePageRes = await fetchText(`${primaryBase}/catalogue/${chosenSlug}/`);
    if (animePageRes.status !== 200) {
      return { success: false, error: `Animé non trouvé sur Anime-Sama (${chosenSlug})` };
    }

    const panneauRegex = /panneauAnime\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
    const panneaux = [...animePageRes.body.matchAll(panneauRegex)].map(m => ({
      name: m[1],
      path: m[2]
    }));

    // Find corresponding season folder
    const sNum = parseInt(season, 10) || 1;
    let targetFolder = `saison${sNum}`;

    if (panneaux.length > 0) {
      const matched = panneaux.find(p => {
        const lower = p.name.toLowerCase();
        return (
          lower === `saison ${sNum}` ||
          lower.includes(`saison ${sNum}`) ||
          lower.includes(`season ${sNum}`) ||
          (sNum === 1 && (lower.includes('saison 1') || lower.includes('season 1') || lower === 'saison1'))
        );
      });

      if (matched && matched.path) {
        targetFolder = matched.path.split('/')[0];
      }
    }

    // 3. Fetch episodes.js
    const targetLang = (lang || 'vf').toLowerCase() === 'vf' ? 'vf' : 'vostfr';
    let epJsUrl = `${primaryBase}/catalogue/${chosenSlug}/${targetFolder}/${targetLang}/episodes.js`;
    let epJsRes = await fetchText(epJsUrl);

    let actualLang = targetLang;
    // Fallback to VOSTFR if VF doesn't exist
    if (epJsRes.status !== 200 && targetLang === 'vf') {
      epJsUrl = `${primaryBase}/catalogue/${chosenSlug}/${targetFolder}/vostfr/episodes.js`;
      epJsRes = await fetchText(epJsUrl);
      actualLang = 'vostfr';
    }

    if (epJsRes.status !== 200) {
      return {
        success: false,
        error: `Saison ${season} introuvable sur Anime-Sama pour ${chosenCard?.title || title}`,
        slug: chosenSlug
      };
    }

    // 4. Parse episode players
    const parseArray = (varName) => {
      const regex = new RegExp(`var\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'i');
      const match = epJsRes.body.match(regex);
      if (!match) return [];
      return [...match[1].matchAll(/['"](https?:[^'"]+)['"]/g)].map(m => m[1]);
    };

    const eps1 = parseArray('eps1');
    const eps2 = parseArray('eps2');
    const eps3 = parseArray('eps3');
    const eps4 = parseArray('eps4');

    const epIndex = (parseInt(episode, 10) || 1) - 1;

    const players = [];
    if (eps1[epIndex]) {
      const u = eps1[epIndex];
      const name = u.includes('sibnet') ? 'Sibnet (VF Rapide • Recommandé)' : 'Lecteur 1';
      players.push({ name, url: u, type: 'sibnet' });
    }
    if (eps2[epIndex]) {
      players.push({ name: 'Lecteur 2 (Miroir)', url: eps2[epIndex], type: 'alt' });
    }
    if (eps3[epIndex]) {
      const u = eps3[epIndex];
      const name = u.includes('vidmoly') ? 'Vidmoly' : 'Lecteur 3';
      players.push({ name, url: u, type: 'vidmoly' });
    }
    if (eps4[epIndex]) {
      players.push({ name: 'Lecteur 4', url: eps4[epIndex], type: 'alt' });
    }

    if (players.length === 0) {
      return {
        success: false,
        error: `Épisode ${episode} non disponible (Total saison : ${eps1.length})`,
        totalEpisodes: eps1.length,
        language: actualLang
      };
    }

    return {
      success: true,
      anime: chosenSlug,
      title: chosenCard?.title || title,
      season: targetFolder,
      episode: parseInt(episode, 10) || 1,
      language: actualLang,
      streamUrl: players[0].url,
      players,
      totalEpisodes: eps1.length
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { title, season = 1, episode = 1, lang = 'vf' } = req.query || {};

  if (!title) {
    return res.status(400).json({ success: false, error: 'Paramètre title manquant' });
  }

  const result = await resolveAnimeSama({ title, season, episode, lang });
  return res.status(200).json(result);
}
