#!/usr/bin/env node
/**
 * Erodium Oracle Cloud ARM Preloader & NVMe Video Cache Engine
 * Runs on 141.145.199.149:3002 (proxied via Nginx /erodium-stream/)
 * - Pre-indexes catalog & resolves SkyStream streams into persistent JSON DB
 * - Caches .m3u8 playlists in RAM and .ts/.aac/.m4s segments on NVMe SSD (up to 80 GB LRU)
 * - Sliding-window lookahead preloader: whenever segment #N is requested (or an episode is resolved),
 *   automatically pre-downloads the next 15 segments + next episode (N+1) onto Oracle's SSD at 1 Gbps.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const PORT = Number(process.env.PORT || 3002);
const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(BASE_DIR, 'data');
const CACHE_DIR = path.join(BASE_DIR, 'cache', 'segments');
const DB_FILE = path.join(DATA_DIR, 'streams-db.json');

const MAX_DISK_CACHE_BYTES = 75 * 1024 * 1024 * 1024; // 75 GB max on NVMe SSD
const LOOKAHEAD_SEGMENTS = 15; // Preload 15 segments ahead (~60-90s of 1080p video)
const INITIAL_PRELOAD_SEGMENTS = 12; // Preload first 12 segments immediately when episode is resolved
const MAX_CONCURRENT_PRELOADS = 6;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

// Persistent Stream Resolution Database
let streamsDb = {
  searchMap: {}, // searchKey -> match object
  streams: {},   // streamKey -> resolved payload
  catalog: [],   // indexed catalog items
  updatedAt: 0,
};

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      streamsDb = { ...streamsDb, ...raw };
    }
  }
} catch (e) {
  console.warn('[OracleDB] Initialisation nouvelle base:', e.message);
}

let dbSaveTimer = null;
function scheduleSaveDb() {
  if (dbSaveTimer) return;
  dbSaveTimer = setTimeout(() => {
    dbSaveTimer = null;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(streamsDb), 'utf8');
    } catch (e) {
      console.error('[OracleDB] Erreur sauvegarde DB:', e.message);
    }
  }, 5000);
}

// In-memory caches & stats
const playlistRamCache = new Map(); // url -> { body, finalUrl, ts }
const segmentNextMap = new Map();   // segUrl -> [nextSegUrl1, nextSegUrl2, ...]
const inFlightSegments = new Map(); // segUrl -> Promise<Buffer | null>
const preloadQueue = [];
const queuedSet = new Set();
let activePreloadWorkers = 0;

const stats = {
  startedAt: Date.now(),
  segmentHits: 0,
  segmentMisses: 0,
  preloadedSegmentsCount: 0,
  preloadedBytes: 0,
  resolvedEpisodes: Object.keys(streamsDb.streams || {}).length,
};

function getRefererForUrl(url) {
  if (url.includes('finepulfe.xyz') || url.includes('skystream')) {
    return 'https://skystream.fun/';
  }
  return 'https://papadustream.club/';
}

function getSegmentPath(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  const subDir = path.join(CACHE_DIR, hash.slice(0, 2));
  return { subDir, filePath: path.join(subDir, `${hash}.bin`) };
}

function hasCachedSegment(url) {
  const { filePath } = getSegmentPath(url);
  try {
    const st = fs.statSync(filePath);
    return st.size > 256;
  } catch {
    return false;
  }
}

async function fetchSegmentBuffer(url) {
  if (inFlightSegments.has(url)) {
    return inFlightSegments.get(url);
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': getRefererForUrl(url),
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return null;
      const arrBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrBuf);
      if (buf.length > 256) {
        const { subDir, filePath } = getSegmentPath(url);
        fs.mkdirSync(subDir, { recursive: true });
        const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
        fs.writeFileSync(tmpPath, buf);
        fs.renameSync(tmpPath, filePath);
        stats.preloadedSegmentsCount++;
        stats.preloadedBytes += buf.length;
      }
      return buf;
    } catch {
      return null;
    } finally {
      inFlightSegments.delete(url);
    }
  })();

  inFlightSegments.set(url, promise);
  return promise;
}

function enqueuePreloadSegments(urls, priority = false) {
  for (const u of urls) {
    if (!u || queuedSet.has(u) || inFlightSegments.has(u) || hasCachedSegment(u)) continue;
    queuedSet.add(u);
    if (priority) {
      preloadQueue.unshift(u);
    } else {
      preloadQueue.push(u);
    }
  }
  if (preloadQueue.length > 600) {
    const removed = preloadQueue.splice(600);
    for (const r of removed) queuedSet.delete(r);
  }
  pumpPreloadQueue();
}

function pumpPreloadQueue() {
  while (activePreloadWorkers < MAX_CONCURRENT_PRELOADS && preloadQueue.length > 0) {
    const nextUrl = preloadQueue.shift();
    queuedSet.delete(nextUrl);
    if (!nextUrl || hasCachedSegment(nextUrl)) continue;
    activePreloadWorkers++;
    fetchSegmentBuffer(nextUrl).finally(() => {
      activePreloadWorkers--;
      pumpPreloadQueue();
    });
  }
}

// Parse playlist, index segment lookahead chain, and rewrite URLs for proxy
function parseAndRewritePlaylist(content, baseUrl, proxyPrefix = '/api/hls-proxy?v=2&url=') {
  const lines = content.split(/\r?\n/);
  const rewritten = [];
  const segmentUrls = [];
  const subPlaylistUrls = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      rewritten.push(line);
      continue;
    }

    if (trimmed.startsWith('#EXT-X-MEDIA:') && /TYPE=SUBTITLES/i.test(trimmed)) {
      const uriMatch = trimmed.match(/URI=["']([^"']+)["']/i);
      if (!uriMatch || /\.(vtt|srt)(\?|$)/i.test(uriMatch[1])) {
        continue;
      }
    }

    if (trimmed.startsWith('#EXT-X-STREAM-INF:') && /SUBTITLES=/i.test(trimmed)) {
      const cleaned = trimmed
        .replace(/,SUBTITLES="[^"]*"/gi, '')
        .replace(/SUBTITLES="[^"]*",?/gi, '');
      rewritten.push(cleaned);
      continue;
    }

    if (trimmed.includes('URI="')) {
      rewritten.push(
        trimmed.replace(/URI=["']([^"']+)["']/g, (m, uri) => {
          const abs = new URL(uri, baseUrl).toString();
          if (abs.includes('.m3u8')) subPlaylistUrls.push(abs);
          else segmentUrls.push(abs);
          return `URI="${proxyPrefix}${encodeURIComponent(abs)}"`;
        })
      );
      continue;
    }

    if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }

    const abs = new URL(trimmed, baseUrl).toString();
    if (abs.includes('.m3u8')) {
      subPlaylistUrls.push(abs);
    } else {
      segmentUrls.push(abs);
    }
    rewritten.push(`${proxyPrefix}${encodeURIComponent(abs)}`);
  }

  // Register lookahead chain so requesting segment[i] automatically preloads segment[i+1..i+15]
  if (segmentUrls.length > 0) {
    if (segmentNextMap.size > 25000) segmentNextMap.clear();
    for (let i = 0; i < segmentUrls.length; i++) {
      const nextSlice = segmentUrls.slice(i + 1, i + 1 + LOOKAHEAD_SEGMENTS);
      if (nextSlice.length > 0) {
        segmentNextMap.set(segmentUrls[i], nextSlice);
      }
    }
  }

  return {
    rewrittenText: rewritten.join('\n'),
    segmentUrls,
    subPlaylistUrls,
  };
}

async function fetchAndCachePlaylist(targetUrl) {
  const cached = playlistRamCache.get(targetUrl);
  if (cached && Date.now() - cached.ts < 30 * 60 * 1000) {
    return cached;
  }

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': getRefererForUrl(targetUrl),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Upstream playlist HTTP ${res.status}`);
  }

  const body = await res.text();
  const finalUrl = res.url || targetUrl;
  const entry = { body, finalUrl, ts: Date.now() };
  if (playlistRamCache.size > 2000) playlistRamCache.clear();
  playlistRamCache.set(targetUrl, entry);
  return entry;
}

// Preload master playlist -> highest 1080p video track + audio track -> first N segments
async function warmUpStreamOnSsd(rawMasterUrl, numSegments = INITIAL_PRELOAD_SEGMENTS) {
  if (!rawMasterUrl || !rawMasterUrl.includes('.m3u8')) return;
  try {
    const masterEntry = await fetchAndCachePlaylist(rawMasterUrl);
    const { segmentUrls, subPlaylistUrls } = parseAndRewritePlaylist(
      masterEntry.body,
      masterEntry.finalUrl
    );

    // If master playlist already contains direct segments, preload them immediately
    if (segmentUrls.length > 0) {
      enqueuePreloadSegments(segmentUrls.slice(0, numSegments), true);
      return;
    }

    // Otherwise, pick the last/highest video sub-playlist and first audio sub-playlist
    if (subPlaylistUrls.length > 0) {
      const videoSub = subPlaylistUrls[subPlaylistUrls.length - 1];
      const audioSub = subPlaylistUrls[0] !== videoSub ? subPlaylistUrls[0] : null;
      const targets = [videoSub, audioSub].filter(Boolean);

      for (const subUrl of targets) {
        try {
          const subEntry = await fetchAndCachePlaylist(subUrl);
          const parsedSub = parseAndRewritePlaylist(subEntry.body, subEntry.finalUrl);
          if (parsedSub.segmentUrls.length > 0) {
            enqueuePreloadSegments(parsedSub.segmentUrls.slice(0, numSegments), true);
          }
        } catch {}
      }
    }
  } catch {}
}

function cleanQuery(str) {
  if (!str) return '';
  return str
    .replace(/\b(saison|season|episode|ep|vf|vostfr|hd|4k|1080p|720p)\b.*$/i, '')
    .trim();
}

async function resolveEpisodeStream({ title, year = null, type = 'movie', season = 1, episode = 1, tmdbId = null }) {
  if (!title) return { success: false, error: 'Titre manquant' };

  const mediaType = type === 'tv' || type === 'series' ? 'tv' : 'movie';
  const query = cleanQuery(title);
  const searchKey = `${query.toLowerCase()}_${mediaType}_${year || ''}`;
  const streamKey = `${searchKey}_s${season}_e${episode}`;

  // Check persistent DB cache (valid for 6 hours since tokens/URLs refresh periodically)
  const existing = streamsDb.streams[streamKey];
  if (existing && existing.ts && Date.now() - existing.ts < 6 * 3600 * 1000 && existing.data?.success) {
    // Trigger SSD warmup of first segments asynchronously
    warmUpStreamOnSsd(existing.data.rawStreamUrl, INITIAL_PRELOAD_SEGMENTS);
    return existing.data;
  }

  let match = streamsDb.searchMap[searchKey];
  if (!match) {
    const searchRes = await fetch(`https://skystream.fun/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://skystream.fun/',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      return { success: false, error: `Erreur recherche SkyStream (${searchRes.status})` };
    }

    const searchData = await searchRes.json().catch(() => ({}));
    const items = Array.isArray(searchData.items) ? searchData.items : [];
    if (items.length === 0) {
      return { success: false, error: `Titre « ${title} » introuvable` };
    }

    const matchingType = items.filter((i) =>
      mediaType === 'tv' ? i.kind === 'tv' || i.kind === 'anime' : i.kind === 'movie'
    );
    const candidates = matchingType.length > 0 ? matchingType : items;

    if (year) {
      const yNum = parseInt(year, 10);
      match = candidates.find((i) => Math.abs(parseInt(i.year, 10) - yNum) <= 1);
    }
    if (!match) match = candidates[0];

    if (match) {
      streamsDb.searchMap[searchKey] = match;
      scheduleSaveDb();
    }
  }

  const playPayload = {
    id: String(match.id),
    type: mediaType,
  };
  if (mediaType === 'tv') {
    playPayload.season = parseInt(season, 10) || 1;
    playPayload.episode = parseInt(episode, 10) || 1;
  }

  const playRes = await fetch('https://skystream.fun/api/play', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `https://skystream.fun/${mediaType === 'tv' ? 'serie' : 'film'}/${match.id}`,
    },
    body: JSON.stringify(playPayload),
    signal: AbortSignal.timeout(10000),
  });

  if (!playRes.ok) {
    const errData = await playRes.json().catch(() => ({}));
    return { success: false, error: errData.error || `Erreur lecture (${playRes.status})` };
  }

  const data = await playRes.json();
  let streamUrl = null;

  if (data.fallbackUrl && data.fallbackUrl.includes('token=')) {
    try {
      const token = new URL(data.fallbackUrl, 'https://skystream.fun').searchParams.get('token');
      if (token) {
        const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        if (payload && payload.u && payload.u.startsWith('http')) {
          streamUrl = payload.u;
        }
      }
    } catch {}
  }

  if (!streamUrl && data.url) {
    streamUrl = data.url.startsWith('http')
      ? data.url
      : `https://skystream.fun${data.url.startsWith('/') ? '' : '/'}${data.url}`;
  }

  if (!streamUrl) {
    return { success: false, error: 'Flux vidéo indisponible' };
  }

  let resolvedTmdbId = tmdbId;
  if (!resolvedTmdbId && streamUrl) {
    const m = streamUrl.match(/\/(?:tv|movies)\/(\d+)-/i);
    if (m) resolvedTmdbId = Number(m[1]);
  }

  const proxiedStreamUrl = streamUrl.includes('.m3u8')
    ? `/api/hls-proxy?v=2&url=${encodeURIComponent(streamUrl)}`
    : streamUrl;

  const proxiedSubtitles = (Array.isArray(data.subtitles) ? data.subtitles : []).map((sub) => ({
    ...sub,
    url:
      sub.url && sub.url.startsWith('http')
        ? `/api/hls-proxy?v=2&url=${encodeURIComponent(sub.url)}`
        : sub.url,
  }));

  const resultPayload = {
    success: true,
    streamUrl: proxiedStreamUrl,
    rawStreamUrl: streamUrl,
    format: data.format || (streamUrl.includes('.m3u8') ? 'hls' : 'mp4'),
    subtitles: proxiedSubtitles,
    audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks : [],
    skipSegments: [],
    tmdbId: resolvedTmdbId || null,
    title: match.title || title,
    year: match.year,
    provider: 'skystream-oracle',
  };

  streamsDb.streams[streamKey] = { ts: Date.now(), data: resultPayload };
  stats.resolvedEpisodes = Object.keys(streamsDb.streams).length;
  scheduleSaveDb();

  // Immediately warm up current episode segments on Oracle's NVMe SSD!
  warmUpStreamOnSsd(streamUrl, INITIAL_PRELOAD_SEGMENTS);

  // If this is a TV series, also pre-resolve and warm up Episode N+1 in the background!
  if (mediaType === 'tv') {
    const nextEp = (parseInt(episode, 10) || 1) + 1;
    setTimeout(() => {
      resolveEpisodeStream({
        title,
        year,
        type: 'tv',
        season,
        episode: nextEp,
        tmdbId: resolvedTmdbId,
      }).catch(() => {});
    }, 1500);
  }

  return resultPayload;
}

// Background Catalog Indexer: pre-indexes movies & series from SkyStream
async function backgroundCatalogCrawl() {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'v', 'w'];
  for (const letter of letters) {
    try {
      const res = await fetch(`https://skystream.fun/api/search?q=${letter}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://skystream.fun/',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const items = Array.isArray(data.items) ? data.items : [];
        for (const item of items) {
          if (!item || !item.title) continue;
          const mType = item.kind === 'tv' || item.kind === 'anime' ? 'tv' : 'movie';
          const q = cleanQuery(item.title).toLowerCase();
          streamsDb.searchMap[`${q}_${mType}_${item.year || ''}`] = item;
          streamsDb.searchMap[`${q}_${mType}_`] = item;
        }
        scheduleSaveDb();
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
}

// Periodic Disk Cache Cleanup (LRU eviction if > 75 GB)
function enforceDiskCacheQuota() {
  try {
    const subDirs = fs.readdirSync(CACHE_DIR);
    const files = [];
    let totalBytes = 0;

    for (const sub of subDirs) {
      const subPath = path.join(CACHE_DIR, sub);
      let entries = [];
      try {
        entries = fs.readdirSync(subPath);
      } catch {
        continue;
      }
      for (const f of entries) {
        const fp = path.join(subPath, f);
        try {
          const st = fs.statSync(fp);
          if (st.isFile()) {
            totalBytes += st.size;
            files.push({ fp, size: st.size, mtime: st.mtimeMs });
          }
        } catch {}
      }
    }

    if (totalBytes > MAX_DISK_CACHE_BYTES) {
      files.sort((a, b) => a.mtime - b.mtime);
      for (const file of files) {
        if (totalBytes <= MAX_DISK_CACHE_BYTES * 0.8) break;
        try {
          fs.unlinkSync(file.fp);
          totalBytes -= file.size;
        } catch {}
      }
    }
  } catch {}
}

setInterval(enforceDiskCacheQuota, 15 * 60 * 1000);
setTimeout(backgroundCatalogCrawl, 3000);
setInterval(backgroundCatalogCrawl, 6 * 3600 * 1000);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname.replace(/^\/erodium-stream/, '') || '/';

  // 1. Health & Stats Endpoint
  if (pathname === '/status' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        ok: true,
        indexedTitles: Object.keys(streamsDb.searchMap).length,
        resolvedEpisodes: Object.keys(streamsDb.streams).length,
        ramPlaylists: playlistRamCache.size,
        preloadQueueLength: preloadQueue.length,
        activePreloadWorkers,
        stats,
      })
    );
  }

  // 2. Instant Stream Resolution + SSD Preload Trigger
  if (pathname === '/resolve') {
    try {
      const title = parsedUrl.searchParams.get('title') || '';
      const year = parsedUrl.searchParams.get('year');
      const type = parsedUrl.searchParams.get('type') || 'movie';
      const season = parseInt(parsedUrl.searchParams.get('season'), 10) || 1;
      const episode = parseInt(parsedUrl.searchParams.get('episode'), 10) || 1;
      const tmdbId = parsedUrl.searchParams.get('tmdbId');

      const result = await resolveEpisodeStream({ title, year, type, season, episode, tmdbId });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 3. High-Speed NVMe SSD HLS Proxy + Sliding-Window Lookahead Preloader
  if (pathname === '/hls') {
    const rawUrl = parsedUrl.searchParams.get('url');
    if (!rawUrl) {
      res.writeHead(400);
      return res.end('Missing url parameter');
    }

    try {
      const decodedUrl = decodeURIComponent(rawUrl);

      const isBinaryChunk =
        /\.(ts|aac|m4s|mp4|cmfv|cmfa)(\?|$)/i.test(decodedUrl) ||
        (decodedUrl.includes('seg-') && !decodedUrl.includes('.m3u8'));

      if (isBinaryChunk) {
        // Trigger lookahead preloading of the next 15 segments immediately!
        const nextSegs = segmentNextMap.get(decodedUrl);
        if (nextSegs && nextSegs.length > 0) {
          enqueuePreloadSegments(nextSegs, true);
        }

        let contentType = 'video/mp2t';
        if (decodedUrl.includes('.aac')) contentType = 'audio/aac';
        if (decodedUrl.includes('.m4s') || decodedUrl.includes('.mp4')) contentType = 'video/mp4';

        const { filePath } = getSegmentPath(decodedUrl);

        // Serve directly from NVMe SSD if already preloaded!
        if (hasCachedSegment(decodedUrl)) {
          stats.segmentHits++;
          const st = fs.statSync(filePath);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': st.size,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
            'X-Oracle-Cache': 'HIT',
          });
          return fs.createReadStream(filePath).pipe(res);
        }

        // Otherwise fetch (or join in-flight preload), cache on SSD, and return
        stats.segmentMisses++;
        const buf = await fetchSegmentBuffer(decodedUrl);
        if (!buf) {
          res.writeHead(502);
          return res.end('Upstream segment error');
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
          'X-Oracle-Cache': 'MISS-STORED',
        });
        return res.end(buf);
      }

      // VTT Subtitles
      if (decodedUrl.includes('.vtt') || decodedUrl.includes('.srt')) {
        const entry = await fetchAndCachePlaylist(decodedUrl);
        res.writeHead(200, {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        });
        return res.end(entry.body);
      }

      // HLS Playlist (.m3u8)
      const entry = await fetchAndCachePlaylist(decodedUrl);
      const { rewrittenText, segmentUrls } = parseAndRewritePlaylist(
        entry.body,
        entry.finalUrl,
        '/api/hls-proxy?v=2&url='
      );

      // Immediately preload the first 10 segments of this playlist onto SSD!
      if (segmentUrls.length > 0) {
        enqueuePreloadSegments(segmentUrls.slice(0, 10), true);
      }

      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=1800',
        'X-Oracle-Cache': 'PLAYLIST',
      });
      return res.end(rewrittenText);
    } catch (err) {
      res.writeHead(502);
      return res.end(err.message || 'HLS proxy error');
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Erodium Oracle Engine] Listening on http://127.0.0.1:${PORT}`);
});
