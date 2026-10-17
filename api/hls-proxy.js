import https from 'https';
import { applyHlsSecurity } from '../lib/security.js';

function getRefererForUrl(url) {
  if (url.includes('finepulfe.xyz') || url.includes('skystream')) {
    return 'https://skystream.fun/';
  }
  return 'https://papadustream.club/';
}

function fetchPlaylistText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': getRefererForUrl(url)
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
  const rewritten = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      rewritten.push(line);
      continue;
    }

    // 1. Strip #EXT-X-MEDIA:TYPE=SUBTITLES pointing directly to .vtt/.srt files
    // (Hls.js expects an .m3u8 subtitle playlist URI; raw .vtt causes a fatal levelParsingError)
    if (trimmed.startsWith('#EXT-X-MEDIA:') && /TYPE=SUBTITLES/i.test(trimmed)) {
      const uriMatch = trimmed.match(/URI=["']([^"']+)["']/i);
      if (!uriMatch || /\.(vtt|srt)(\?|$)/i.test(uriMatch[1])) {
        continue;
      }
    }

    // 2. Strip SUBTITLES="..." attribute from #EXT-X-STREAM-INF
    if (trimmed.startsWith('#EXT-X-STREAM-INF:') && /SUBTITLES=/i.test(trimmed)) {
      const cleaned = trimmed
        .replace(/,SUBTITLES="[^"]*"/gi, '')
        .replace(/SUBTITLES="[^"]*",?/gi, '');
      rewritten.push(cleaned);
      continue;
    }

    // 3. Handle URI attributes for audio and valid m3u8 tracks
    if (trimmed.includes('URI="')) {
      rewritten.push(
        trimmed.replace(/URI=["']([^"']+)["']/g, (m, uri) => {
          const abs = new URL(uri, baseUrl).toString();
          return `URI="/api/hls-proxy?v=2&url=${encodeURIComponent(abs)}"`;
        })
      );
      continue;
    }

    // 4. Pass comments and tags as is
    if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }

    // 5. Both .m3u8 and .ts pass through the proxy so there are ZERO duplicate CORS headers
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

    // 1. If it's a binary media chunk (.ts, .aac, .m4s, .mp4)
    const isBinaryChunk = 
      decodedUrl.includes('.ts') || 
      decodedUrl.includes('.aac') || 
      decodedUrl.includes('.m4s') || 
      decodedUrl.includes('.mp4');

    if (isBinaryChunk) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': getRefererForUrl(decodedUrl)
      };
      if (req.headers['range']) {
        headers['Range'] = req.headers['range'];
      }

      let contentType = 'video/mp2t';
      if (decodedUrl.includes('.aac')) contentType = 'audio/aac';
      if (decodedUrl.includes('.m4s') || decodedUrl.includes('.mp4')) contentType = 'video/mp4';

      const clientReq = https.get(decodedUrl, { headers }, (clientRes) => {
        res.writeHead(clientRes.statusCode, {
          'Content-Type': contentType,
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
