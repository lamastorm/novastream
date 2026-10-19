export const config = {
  runtime: 'edge',
};

const ORACLE_BASE = 'http://141.145.199.149/erodium-stream';

export default async function handler(req) {
  const { searchParams } = new URL(req.url, 'https://erodium.vercel.app');
  const tmdbId = searchParams.get('tmdbId') || searchParams.get('id');
  const type = searchParams.get('type') || 'tv';
  const season = searchParams.get('season') || searchParams.get('sa') || '1';
  const episode = searchParams.get('episode') || searchParams.get('epi') || '1';

  if (!tmdbId) {
    return new Response(JSON.stringify({ success: false, error: 'Paramètre tmdbId requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const oParams = new URLSearchParams({
      tmdbId: String(tmdbId),
      type,
      season: String(season),
      episode: String(episode),
    });

    const oRes = await fetch(`${ORACLE_BASE}/vidmoly-resolve?${oParams.toString()}`, {
      headers: { 'User-Agent': 'Erodium-Edge-Proxy/1.0' },
      signal: AbortSignal.timeout(18000),
    });

    if (oRes.ok) {
      const data = await oRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const errBody = await oRes.text().catch(() => '');
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erreur serveur Oracle (${oRes.status})`,
        debug: {
          status: oRes.status,
          statusText: oRes.statusText,
          url: `${ORACLE_BASE}/vidmoly-resolve?${oParams.toString()}`,
          headers: Object.fromEntries(oRes.headers.entries()),
          bodyPreview: errBody.slice(0, 500)
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
