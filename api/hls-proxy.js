export const config = {
  runtime: 'edge',
};

const BLOCKED_UA = /python-requests|aiohttp|scrapy|sqlmap|nikto|wpscan|go-http-client|postmanruntime|insomnia|curl\/|wget\/|libwww-perl|masscan|zgrab/i;

function getRefererForUrl(url) {
  if (url.includes('finepulfe.xyz') || url.includes('skystream')) {
    return 'https://skystream.fun/';
  }
  return 'https://papadustream.club/';
}

function isSafeTargetUrl(targetUrl) {
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return false;
  }
  const lower = targetUrl.toLowerCase();
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('192.168.') ||
    lower.includes('10.') ||
    lower.includes('169.254.') ||
    lower.includes('metadata.google')
  ) {
    return false;
  }
  return true;
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

    // 3. Handle URI attributes for audio, init segments (EXT-X-MAP), and valid m3u8 tracks
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

    // 5. Both .m3u8 and .ts pass through the Edge proxy
    const abs = new URL(trimmed, baseUrl).toString();
    rewritten.push(`/api/hls-proxy?v=2&url=${encodeURIComponent(abs)}`);
  }

  return rewritten.join('\n');
}

function sendCompatResponse(nodeRes, status, headers, body) {
  if (!nodeRes) {
    return new Response(body, { status, headers });
  }
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined && v !== null) nodeRes.setHeader(k, v);
  }
  nodeRes.statusCode = status;
  if (body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    const pump = () =>
      reader.read().then(({ done, value }) => {
        if (done) {
          nodeRes.end();
          return;
        }
        nodeRes.write(Buffer.from(value));
        return pump();
      }).catch(() => nodeRes.end());
    return pump();
  }
  nodeRes.end(body || '');
}

export default async function handler(req, nodeRes) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'X-Content-Type-Options': 'nosniff',
  };

  if (req.method === 'OPTIONS') {
    return sendCompatResponse(nodeRes, 200, corsHeaders, null);
  }

  const getHeader = (name) =>
    typeof req.headers?.get === 'function'
      ? req.headers.get(name)
      : req.headers?.[name.toLowerCase()];

  const ua = getHeader('user-agent') || '';
  if (BLOCKED_UA.test(ua)) {
    return sendCompatResponse(nodeRes, 403, corsHeaders, 'Accès refusé.');
  }

  let rawUrlParam = null;
  if (req.query && req.query.url) {
    rawUrlParam = req.query.url;
  } else if (req.url) {
    const parsed = new URL(req.url, 'https://erodium.vercel.app');
    rawUrlParam = parsed.searchParams.get('url');
  }

  if (!rawUrlParam) {
    return sendCompatResponse(nodeRes, 400, corsHeaders, 'Paramètre url requis');
  }

  try {
    const decodedUrl = decodeURIComponent(rawUrlParam);
    if (!isSafeTargetUrl(decodedUrl)) {
      return sendCompatResponse(nodeRes, 400, corsHeaders, 'URL invalide');
    }

    const upstreamHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': getRefererForUrl(decodedUrl),
    };

    const rangeHeader = getHeader('range');
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const isBinaryChunk =
      /\.(ts|aac|m4s|mp4|cmfv|cmfa)(\?|$)/i.test(decodedUrl) ||
      (decodedUrl.includes('seg-') && !decodedUrl.includes('.m3u8'));

    // 1. Binary video/audio segments (.ts, .aac, .m4s, .mp4)
    // Tenter d'abord de servir depuis le cache SSD NVMe d'Oracle Cloud (1 Gbps)
    if (isBinaryChunk) {
      let upstreamRes = null;
      try {
        const oracleRes = await fetch(
          `http://141.145.199.149/erodium-stream/hls?url=${encodeURIComponent(decodedUrl)}`,
          {
            headers: upstreamHeaders,
            signal: AbortSignal.timeout(4500),
          }
        );
        if (oracleRes.ok) {
          upstreamRes = oracleRes;
        }
      } catch {}

      if (!upstreamRes) {
        upstreamRes = await fetch(decodedUrl, {
          headers: upstreamHeaders,
          redirect: 'follow',
        });
      }

      let contentType = 'video/mp2t';
      if (decodedUrl.includes('.aac')) contentType = 'audio/aac';
      if (decodedUrl.includes('.m4s') || decodedUrl.includes('.mp4')) contentType = 'video/mp4';

      const outHeaders = {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable',
        'CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Vercel-CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Accept-Ranges': 'bytes',
      };

      const cl = upstreamRes.headers.get('content-length');
      if (cl) outHeaders['Content-Length'] = cl;
      const cr = upstreamRes.headers.get('content-range');
      if (cr) outHeaders['Content-Range'] = cr;

      return sendCompatResponse(nodeRes, upstreamRes.status || 200, outHeaders, upstreamRes.body);
    }

    // 2. VTT / SRT Subtitles
    if (decodedUrl.includes('.vtt') || decodedUrl.includes('.srt')) {
      const upstreamRes = await fetch(decodedUrl, {
        headers: upstreamHeaders,
        redirect: 'follow',
      });
      if (!upstreamRes.ok) {
        return sendCompatResponse(nodeRes, upstreamRes.status, corsHeaders, 'Erreur récupération sous-titres');
      }
      const text = await upstreamRes.text();
      return sendCompatResponse(
        nodeRes,
        200,
        {
          ...corsHeaders,
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
        text
      );
    }

    // 3. HLS Playlists (.m3u8)
    const upstreamRes = await fetch(decodedUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    if (!upstreamRes.ok) {
      return sendCompatResponse(nodeRes, upstreamRes.status, corsHeaders, 'Erreur récupération playlist');
    }

    const bodyText = await upstreamRes.text();
    const finalBaseUrl = upstreamRes.url || decodedUrl;
    const modified = rewritePlaylist(bodyText, finalBaseUrl);

    return sendCompatResponse(
      nodeRes,
      200,
      {
        ...corsHeaders,
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
      modified
    );
  } catch (err) {
    return sendCompatResponse(nodeRes, 500, corsHeaders, err.message || 'Erreur proxy HLS');
  }
}
