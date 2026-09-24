import https from 'https';

function fetchPlaylist(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.papadustream.club/'
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

    // Handle URI attributes (audio / subtitles)
    if (trimmed.includes('URI="')) {
      return trimmed.replace(/URI=["']([^"']+)["']/g, (m, uri) => {
        const abs = new URL(uri, baseUrl).toString();
        return `URI="/api/hls-proxy?url=${encodeURIComponent(abs)}"`;
      });
    }

    // Comment or tag
    if (trimmed.startsWith('#')) {
      return line;
    }

    // URL to sub-playlist (.m3u8)
    if (trimmed.includes('.m3u8')) {
      const abs = new URL(trimmed, baseUrl).toString();
      return `/api/hls-proxy?url=${encodeURIComponent(abs)}`;
    }

    // Video segment (.ts) -> point directly to CDN with absolute URL
    if (trimmed.includes('.ts')) {
      return new URL(trimmed, baseUrl).toString();
    }

    return line;
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
    const result = await fetchPlaylist(decodedUrl);

    if (result.status !== 200) {
      return res.status(result.status).send('Erreur récupération playlist');
    }

    const modified = rewritePlaylist(result.body, decodedUrl);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).send(modified);
  } catch (err) {
    return res.status(500).send(err.message);
  }
}
