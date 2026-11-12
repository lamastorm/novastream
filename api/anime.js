import https from 'https';
import { applySecurity } from '../lib/security.js';

function fetchText(url, timeoutMs = 7000, customReferer = 'https://anime-sama.to/') {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': customReferer
      },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        return fetchText(redirectUrl, timeoutMs, customReferer).then(resolve).catch(reject);
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

async function extractDirectAnimeStream(embedUrl) {
  if (!embedUrl || !embedUrl.startsWith('http')) return { url: null, dead: true };
  try {
    const res = await fetchText(embedUrl, 4500, 'https://anime-sama.to/');
    if (res.status >= 400 || !res.body) return { url: null, dead: res.status === 404 || res.status === 410 };
    const html = res.body;

    if (/this video not found|file was deleted|no such file|video has been removed|404 not found/i.test(html)) {
      return { url: null, dead: true };
    }

    // 1. Plain sources: [{ file: 'https://...m3u8...' }] (AnsEmbed / VidMoly)
    const plainMatch = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"](https?:\/\/[^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i);
    if (plainMatch && plainMatch[1]) {
      return { url: `/api/hls-proxy?v=2&url=${encodeURIComponent(plainMatch[1])}`, dead: false };
    }

    // 2. Dean Edwards Packer (Uqload / VidMoly / Sendvid)
    const m = html.match(/return p\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)\)/);
    if (m) {
      let p = m[1];
      const a = parseInt(m[2], 10);
      let c = parseInt(m[3], 10);
      const k = m[4].split('|');
      while (c--) {
        if (k[c]) {
          p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
        }
      }
      const urlMatch = p.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*/i);
      if (urlMatch && urlMatch[0]) {
        return { url: `/api/hls-proxy?v=2&url=${encodeURIComponent(urlMatch[0])}`, dead: false };
      }
    }

    // 3. Sibnet direct MP4 extraction
    if (embedUrl.includes('sibnet.ru')) {
      const sibMatch = html.match(/src\s*:\s*['"](\/v\/[^'"]+\.mp4)['"]/i);
      if (sibMatch && sibMatch[1]) {
        const fullSib = `https://video.sibnet.ru${sibMatch[1]}`;
        return { url: `/api/hls-proxy?v=2&url=${encodeURIComponent(fullSib)}`, dead: false };
      }
    }
  } catch {}
  return { url: null, dead: false };
}

function parseAnimeCards(html) {
  const cards = [];
  const seen = new Set();

  // Nouveau format Anime-Sama (as-carte)
  const newCardRegex = /<div[^>]+class=["'][^"']*as-carte[^"']*["'][^>]+data-url=["']\/?catalogue\/([a-zA-Z0-9_\-]+)\/?["'][^>]*data-nom=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(newCardRegex)) {
    const slug = match[1];
    const cardTitle = match[2]?.trim() || slug;
    if (!slug || slug === 'catalogue' || slug === 'search' || seen.has(slug)) continue;
    seen.add(slug);
    cards.push({ slug, title: cardTitle, altTitles: [] });
  }

  // Ancien format ou liens directs <a href=".../catalogue/slug">
  const cardRegex = /<a[^>]+href=["'](?:https?:\/\/anime-sama\.(?:to|si|org))?\/catalogue\/([a-zA-Z0-9_\-]+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(cardRegex)) {
    const slug = match[1];
    if (!slug || slug === 'catalogue' || slug === 'search' || seen.has(slug)) continue;

    const inner = match[2];
    const titleMatch =
      inner.match(/<h[23][^>]*class=["'][^"']*(?:card-title|as-carte-titre)[^"']*["'][^>]*>([\s\S]*?)<\/h[23]>/i) ||
      inner.match(/title=["']([^"']+)["']/i);
    const altMatch = inner.match(/<p[^>]*class=["'][^"']*alternate-titles[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    
    const cardTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;
    const altTitles = altMatch ? altMatch[1].split(',').map(s => s.trim()) : [];

    seen.add(slug);
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

  const baseDomains = ['https://anime-sama.to', 'https://anime-sama.si'];
  let primaryBase = baseDomains[0];

  // Generate intelligent search candidates for spin-offs and subtitles
  // e.g. "Sword Art Online Alternative: Gun Gale Online" -> ["Sword Art Online Alternative: Gun Gale Online", "Sword Art Online Alternative", "Gun Gale Online", "Sword Art Online"]
  const candidateQueries = [title];
  if (title.includes(':')) {
    const parts = title.split(':');
    candidateQueries.push(parts[0].trim());
    if (parts[1]?.trim()) candidateQueries.push(parts[1].trim());
  }
  if (title.includes('-')) {
    const parts = title.split('-');
    candidateQueries.push(parts[0].trim());
  }
  // Strip common anime subtitles / arcs
  const baseFranchise = title.replace(/\s*(Alternative|Season|\(TV\)|Movie|Film|The Final|Part\s*\d+|Arc).*$/i, '').trim();
  if (baseFranchise && !candidateQueries.includes(baseFranchise)) {
    candidateQueries.push(baseFranchise);
  }

  let chosenSlug = null;
  let chosenCard = null;

  try {
    // 1. Search anime catalog with candidate queries until a match is found
    for (const q of candidateQueries) {
      let searchRes;
      try {
        searchRes = await fetchText(`${primaryBase}/catalogue/?search=${encodeURIComponent(q)}`);
      } catch {
        primaryBase = baseDomains[1];
        searchRes = await fetchText(`${primaryBase}/catalogue/?search=${encodeURIComponent(q)}`);
      }

      const cards = parseAnimeCards(searchRes.body);
      if (cards.length > 0) {
        chosenCard = findBestCard(cards, q);
        if (chosenCard?.slug) {
          chosenSlug = chosenCard.slug;
          break;
        }
      }
    }

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
    })).filter(p => {
      const path = (p.path || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return path && path !== 'url' && name !== 'nom';
    });

    // Find corresponding season folder
    const sNum = parseInt(season, 10) || 1;
    const epNum = parseInt(episode, 10) || 1;
    let targetFolder = `saison${sNum}`;
    let episodeIndex = Math.max(0, epNum - 1);

    if (panneaux.length > 0) {
      let matched = null;

      // Exclude Kai, HS (re-editions/specials), OAV, Films unless sNum or title asks for it
      const mainPanneaux = panneaux.filter(p => {
        const path = p.path.toLowerCase();
        return !path.startsWith('kai') && !path.startsWith('film') && !path.startsWith('oav') && !path.includes('hs');
      });
      const pool = mainPanneaux.length > 0 ? mainPanneaux : panneaux;

      // STRATEGY 1: Absolute episode number if in range [Episode X à Y] (e.g. One Piece Ep 62, Ep 100, Ep 1089)
      const rangePanneaux = pool.filter(p => /\[Episode\s+\d+\s+à/i.test(p.name));
      if (rangePanneaux.length > 0 && epNum >= 62) {
        for (const p of rangePanneaux) {
          const rm = p.name.match(/\[Episode\s+(\d+)\s+à\s*(\d+|\.\.\.)\]/i);
          if (rm) {
            const startEp = parseInt(rm[1], 10);
            const endEp = rm[2] === '...' ? Infinity : parseInt(rm[2], 10);
            if (epNum >= startEp && epNum <= endEp) {
              matched = p;
              episodeIndex = epNum - startEp;
              break;
            }
          }
        }
      }

      // STRATEGY 2: Match by Saga or Season number (e.g. "Saga 1 ...", "Saison 1 ...", "Season 1 ...")
      if (!matched) {
        matched = pool.find(p => {
          const lower = p.name.toLowerCase();
          return (
            lower.startsWith(`saga ${sNum} `) ||
            lower.startsWith(`saison ${sNum} `) ||
            lower.startsWith(`season ${sNum} `) ||
            lower.includes(`saga ${sNum} `) ||
            lower.includes(`saison ${sNum}`) ||
            lower.includes(`season ${sNum}`) ||
            (sNum === 1 && (lower.includes('saison 1') || lower.includes('season 1') || lower.includes('saga 1') || lower === 'saison1'))
          );
        });

        if (matched) {
          const rm = matched.name.match(/\[Episode\s+(\d+)\s+à/i);
          if (rm) {
            const startEp = parseInt(rm[1], 10);
            if (epNum >= startEp) {
              episodeIndex = epNum - startEp;
            } else {
              episodeIndex = Math.max(0, epNum - 1);
            }
          } else {
            episodeIndex = Math.max(0, epNum - 1);
          }
        }
      }

      // STRATEGY 3: Match by folder path
      if (!matched) {
        matched = pool.find(p => p.path.toLowerCase().startsWith(`saison${sNum}/`));
      }

      if (matched && matched.path) {
        targetFolder = matched.path.split('/')[0];
      }
    }

    // 3. Fetch season page (nouveau format 12/11/2026 avec epsJeton + /api/lien.php) ou episodes.js en secours
    const targetLang = (lang || 'vf').toLowerCase() === 'vf' ? 'vf' : 'vostfr';
    let seasonPageUrl = `${primaryBase}/catalogue/${chosenSlug}/${targetFolder}/${targetLang}/`;
    let epRes = await fetchText(seasonPageUrl);

    let actualLang = targetLang;
    // Fallback to VOSTFR if VF doesn't exist
    if (epRes.status !== 200 && targetLang === 'vf') {
      seasonPageUrl = `${primaryBase}/catalogue/${chosenSlug}/${targetFolder}/vostfr/`;
      epRes = await fetchText(seasonPageUrl);
      actualLang = 'vostfr';
    }

    if (epRes.status !== 200) {
      // Fallback legacy episodes.js
      const legacyUrl = `${primaryBase}/catalogue/${chosenSlug}/${targetFolder}/${actualLang}/episodes.js`;
      epRes = await fetchText(legacyUrl);
      if (epRes.status !== 200) {
        return {
          success: false,
          error: `Saison ${season} introuvable sur Anime-Sama pour ${chosenCard?.title || title}`,
          slug: chosenSlug
        };
      }
    }

    // Helper to extract and filter out dead embeds from a season page
    const extractPlayersFromPage = async (pageBody, pageUrl) => {
      const jeton = pageBody.match(/epsJeton\s*=\s*['"]([^'"]+)['"]/)?.[1] || '';
      const parseArr = (varName) => {
        const regex = new RegExp(`var\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`, 'i');
        const match = pageBody.match(regex);
        if (!match) return [];
        return [...match[1].matchAll(/['"]((?:https?:|lien:)[^'"]+)['"]/g)].map(m => m[1]);
      };
      const e1 = parseArr('eps1');
      const e2 = parseArr('eps2');
      const e3 = parseArr('eps3');
      const e4 = parseArr('eps4');

      const resolveLienRef = async (val) => {
        if (!val) return null;
        if (val.startsWith('http')) return val;
        if (val.startsWith('lien:') && jeton) {
          const lienId = val.slice(5);
          try {
            const lienRes = await fetchText(
              `${primaryBase}/api/lien.php?j=${encodeURIComponent(jeton)}&l=${encodeURIComponent(lienId)}`,
              6000,
              pageUrl
            );
            if (lienRes.status === 200 && lienRes.body) {
              const parsed = JSON.parse(lienRes.body);
              if (parsed?.u && parsed.u.startsWith('http')) return parsed.u;
            }
          } catch {}
        }
        return null;
      };

      const rawRefs = [
        { ref: e1[episodeIndex], type: 's1' },
        { ref: e2[episodeIndex], type: 's2' },
        { ref: e3[episodeIndex], type: 's3' },
        { ref: e4[episodeIndex], type: 's4' },
      ].filter(item => Boolean(item.ref));

      const resolvedRaw = (await Promise.all(
        rawRefs.map(async (item) => {
          const u = await resolveLienRef(item.ref);
          if (!u) return null;
          const name = u.includes('sibnet')
            ? 'Sibnet (VF Rapide)'
            : u.includes('uqload')
            ? 'Uqload FHD'
            : (u.includes('ansembed') || u.includes('vidmoly'))
            ? 'AnsEmbed / VidMoly FHD'
            : `Source ${item.type.replace('s', '')}`;
          return { name, url: u, type: item.type };
        })
      )).filter(Boolean);

      const checked = (await Promise.all(
        resolvedRaw.map(async (p, idx) => {
          const extracted = await extractDirectAnimeStream(p.url);
          if (extracted?.dead) return null;
          if (extracted?.url) {
            return {
              name: `⚡ Erodium Direct ${idx + 1} (${p.name} • 0 Pub)`,
              url: extracted.url,
              embedUrl: p.url,
              isDirect: true,
              type: p.type,
            };
          }
          return { ...p, isDirect: false };
        })
      )).filter(Boolean);

      return { players: checked, totalEpisodes: e1.length };
    };

    let { players, totalEpisodes } = await extractPlayersFromPage(epRes.body, seasonPageUrl);

    // Si tous les lecteurs VF sont morts/supprimés (ex: "Sorry This video not found!"), basculer automatiquement sur VOSTFR
    if (players.length === 0 && actualLang === 'vf') {
      const vostfrUrl = `${primaryBase}/catalogue/${chosenSlug}/${targetFolder}/vostfr/`;
      const vostfrRes = await fetchText(vostfrUrl);
      if (vostfrRes.status === 200) {
        const vResult = await extractPlayersFromPage(vostfrRes.body, vostfrUrl);
        if (vResult.players.length > 0) {
          players = vResult.players;
          totalEpisodes = vResult.totalEpisodes;
          actualLang = 'vostfr';
        }
      }
    }

    if (players.length === 0) {
      return {
        success: false,
        error: `Épisode ${episode} indisponible sur Anime-Sama (sources supprimées ou manquantes)`,
        totalEpisodes,
        language: actualLang
      };
    }

    // Prioriser les flux débridés 100% natifs Erodium (.m3u8/.mp4) en premier !
    players.sort((a, b) => {
      if (a.isDirect && !b.isDirect) return -1;
      if (!a.isDirect && b.isDirect) return 1;
      const getPriority = (url) => {
        if (url.includes('vmget') || url.includes('ansembed') || url.includes('vidmoly')) return 1;
        if (url.includes('uqload')) return 2;
        if (url.includes('sibnet')) return 3;
        if (url.includes('sendvid')) return 10;
        return 5;
      };
      return getPriority(a.embedUrl || a.url) - getPriority(b.embedUrl || b.url);
    });

    return {
      success: true,
      anime: chosenSlug,
      title: chosenCard?.title || title,
      season: targetFolder,
      episode: parseInt(episode, 10) || 1,
      language: actualLang,
      streamUrl: players[0].url,
      players,
      totalEpisodes
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!applySecurity(req, res)) {
    return;
  }

  const { title, season = 1, episode = 1, lang = 'vf' } = req.query || {};

  if (!title) {
    return res.status(400).json({ success: false, error: 'Paramètre title manquant' });
  }

  const result = await resolveAnimeSama({ title, season, episode, lang });
  return res.status(200).json(result);
}
