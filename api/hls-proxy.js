import https from 'https';
import { applyHlsSecurity } from './_security.js';

function fetchPlaylistText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://papadustream.club/'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
}

export function rewritePlaylist(content, baseUrl) {
  const lines = content.split(/\r?\n/);
  const rewritten = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Handle URI attributes for audio and subtitles
    if (trimmed.includes('URI="')) {
      return trimmed.replace(/URI=["']([^"']+)["']/g, (m, uri) => {
        const abs = new URL(uri, baseUrl).toString();
        return `URI="/api/hls-proxy?url=${encodeURIComponent(abs)}"`;
      });
    }

    // Pass comments and tags as is
    if (trimmed.startsWith('#')) {
      return line;
    }

    // Both .m3u8 and .ts pass through the proxy so there are ZERO duplicate CORS headers
    const abs = new URL(trimmed, baseUrl).toString();
    return `/api/hls-proxy?url=${encodeURIComponent(abs)}`;
  });

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

    // 1. If it's a TS segment (binary video/audio chunk)
    if (decodedUrl.includes('.ts')) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://papadustream.club/'
      };
      if (req.headers['range']) {
        headers['Range'] = req.headers['range'];
      }

      const clientReq = https.get(decodedUrl, { headers }, (clientRes) => {
        res.writeHead(clientRes.statusCode, {
          'Content-Type': 'video/mp2t',
          'Content-Length': clientRes.headers['content-length'] || '',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'Accept-Ranges': 'bytes'
        });
        clientRes.pipe(res);
      });

      clientReq.on('error', (e) => {
        if (!res.headersSent) res.status(500).send(e.message);
      });
      return;
    }

    // 1b. If it's a VTT subtitle file
    if (decodedUrl.includes('.vtt')) {
      const result = await fetchPlaylistText(decodedUrl);
      if (result.status !== 200) {
        return res.status(result.status).send('Erreur récupération sous-titres');
      }
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(result.body);
    }

    // 2. If it's a playlist (.m3u8)
    const result = await fetchPlaylistText(decodedUrl);
    if (result.status !== 200) {
      return res.status(result.status).send('Erreur récupération playlist');
    }

    const modified = rewritePlaylist(result.body, decodedUrl);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).send(modified);
  } catch (err) {
    if (!res.headersSent) return res.status(500).send(err.message);
  }
}
