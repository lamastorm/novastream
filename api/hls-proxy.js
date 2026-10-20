import https from 'https';
import http from 'http';
import { applyHlsSecurity } from '../lib/security.js';

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 128,
  maxFreeSockets: 32,
  timeout: 15000,
});
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 128,
  maxFreeSockets: 32,
  timeout: 15000,
});

function getRefererForUrl(url) {
  if (url.includes('finepulfe.xyz') || url.includes('skystream') || url.includes('b-cdn.net') || url.includes('bunnycdn')) {
    return 'https://skystream.fun/';
  }
  if (url.includes('cloudwindow-route') || url.includes('voe.sx') || url.includes('frembed') || url.includes('vidmoly')) {
    return 'https://voe.sx/';
  }
  return 'https://papadustream.club/';
}

function getClient(url) {
  return url.startsWith('http://') ? http : https;
}

function getAgent(url) {
  return url.startsWith('http://') ? httpAgent : httpsAgent;
}

function fetchPlaylistText(url, redirectsLeft = 5) {
  const oracleUrl = `http://141-145-199-149.sslip.io/erodium-stream/hls?url=${encodeURIComponent(url)}`;
  
  return new Promise((resolve) => {
    const oReq = http.get(oracleUrl, { agent: httpAgent, timeout: 4000 }, (oRes) => {
      if (oRes.statusCode === 200) {
        let d = '';
        oRes.on('data', c => d += c);
        oRes.on('end', () => resolve({ status: 200, body: d, finalUrl: url }));
        return;
      }
      oRes.resume();
      fetchUpstreamDirect(url, redirectsLeft).then(resolve);
    });
    oReq.on('error', () => {
      fetchUpstreamDirect(url, redirectsLeft).then(resolve);
    });
    oReq.on('timeout', () => {
      oReq.destroy();
      fetchUpstreamDirect(url, redirectsLeft).then(resolve);
    });
  });
}

function fetchUpstreamDirect(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const client = getClient(url);
    const req = client.get(url, {
      agent: getAgent(url),
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Referer': getRefererForUrl(url)
      }
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const nextUrl = new URL(res.headers.location, url).toString();
        return fetchUpstreamDirect(nextUrl, redirectsLeft - 1).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, finalUrl: url }));
    });
    req.on('timeout', () => {
      req.destroy(new Error('Timeout fetching playlist'));
    });
    req.on('error', reject);
  });
}

function streamBinaryWithRedirects(url, reqHeaders, res, contentType, redirectsLeft = 5) {
  const oracleUrl = `http://141-145-199-149.sslip.io/erodium-stream/hls?url=${encodeURIComponent(url)}`;
  
  const oHeaders = { ...reqHeaders };
  const oReq = http.get(oracleUrl, { agent: httpAgent, headers: oHeaders, timeout: 12000 }, (oRes) => {
    if (oRes.statusCode === 200 || oRes.statusCode === 206) {
      const outHeaders = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable',
        'CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Vercel-CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Accept-Ranges': 'bytes',
        'X-Oracle-Cache': oRes.headers['x-oracle-cache'] || 'HIT',
      };
      if (oRes.headers['content-length']) outHeaders['Content-Length'] = oRes.headers['content-length'];
      if (oRes.headers['content-range']) outHeaders['Content-Range'] = oRes.headers['content-range'];

      res.writeHead(oRes.statusCode, outHeaders);
      oRes.pipe(res);
      return;
    }
    oRes.resume();
    pipeDirectUpstream(url, reqHeaders, res, contentType, redirectsLeft);
  });

  oReq.on('error', () => {
    pipeDirectUpstream(url, reqHeaders, res, contentType, redirectsLeft);
  });
  oReq.on('timeout', () => {
    oReq.destroy();
    pipeDirectUpstream(url, reqHeaders, res, contentType, redirectsLeft);
  });
}

function pipeDirectUpstream(url, reqHeaders, res, contentType, redirectsLeft = 5) {
  const client = getClient(url);
  const clientReq = client.get(url, {
    agent: getAgent(url),
    timeout: 15000,
    headers: {
      ...reqHeaders,
      'Connection': 'keep-alive',
    }
  }, (clientRes) => {
    if ([301, 302, 303, 307, 308].includes(clientRes.statusCode) && clientRes.headers.location && redirectsLeft > 0) {
      clientRes.resume();
      const nextUrl = new URL(clientRes.headers.location, url).toString();
      return pipeDirectUpstream(nextUrl, reqHeaders, res, contentType, redirectsLeft - 1);
    }

    const outHeaders = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable',
      'CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Vercel-CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Accept-Ranges': 'bytes'
    };
    if (clientRes.headers['content-length']) {
      outHeaders['Content-Length'] = clientRes.headers['content-length'];
    }
    if (clientRes.headers['content-range']) {
      outHeaders['Content-Range'] = clientRes.headers['content-range'];
    }

    res.writeHead(clientRes.statusCode || 200, outHeaders);
    clientRes.pipe(res);
  });

  clientReq.on('timeout', () => {
    clientReq.destroy();
    if (!res.headersSent) res.status(504).send('Gateway Timeout');
  });

  clientReq.on('error', (e) => {
    if (!res.headersSent) res.status(502).send(e.message);
  });
}

export function rewritePlaylist(content, baseUrl) {
  const lines = content.split(/\r?\n/);
  const rewritten = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      rewritten.push(line);
      continue;
    }

    // Si déjà réécrit par Oracle ou un proxy précédent, conserver tel quel
    if (trimmed.includes('/api/hls-proxy')) {
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
          return `URI="/api/hls-proxy?v=2&url=${encodeURIComponent(abs)}"`;
        })
      );
      continue;
    }

    if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }

    const abs = new URL(trimmed, baseUrl).toString();
    rewritten.push(`/api/hls-proxy?v=2&url=${encodeURIComponent(abs)}`);
  }

  return rewritten.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query || {};
  if (!url) {
    return res.status(400).send('Paramètre url requis');
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    if (!applyHlsSecurity(req, res, decodedUrl)) {
      return;
    }

    const isBinaryChunk =
      /\.(ts|aac|m4s|mp4|cmfv|cmfa)(\?|$)/i.test(decodedUrl) ||
      decodedUrl.includes('/api/custom-stream') ||
      (decodedUrl.includes('seg-') && !decodedUrl.includes('.m3u8'));

    if (isBinaryChunk) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': getRefererForUrl(decodedUrl)
      };
      if (req.headers['range']) {
        headers['Range'] = req.headers['range'];
      }

      let contentType = 'video/mp2t';
      if (decodedUrl.includes('.aac')) contentType = 'audio/aac';
      if (decodedUrl.includes('.m4s') || decodedUrl.includes('.mp4') || decodedUrl.includes('/api/custom-stream')) contentType = 'video/mp4';

      streamBinaryWithRedirects(decodedUrl, headers, res, contentType, 5);
      return;
    }

    if (decodedUrl.includes('.vtt') || decodedUrl.includes('.srt')) {
      const result = await fetchPlaylistText(decodedUrl);
      if (result.status !== 200) {
        return res.status(result.status).send('Erreur récupération sous-titres');
      }
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(result.body);
    }

    const result = await fetchPlaylistText(decodedUrl);
    if (result.status !== 200) {
      return res.status(result.status).send('Erreur récupération playlist');
    }

    const modified = rewritePlaylist(result.body, result.finalUrl || decodedUrl);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).send(modified);
  } catch (err) {
    if (!res.headersSent) return res.status(500).send(err.message);
  }
}
