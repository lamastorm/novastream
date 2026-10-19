export const config = {
  runtime: 'edge',
};

const ORACLE_BASE = 'http://141-145-199-149.sslip.io/erodium-stream';

export default async function handler(req) {
  const { searchParams } = new URL(req.url, 'https://erodium.vercel.app');
  const title = searchParams.get('title');
  const year = searchParams.get('year') || '';

  if (!title) {
    return new Response(JSON.stringify({ success: false, error: 'Paramètre title requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const oParams = new URLSearchParams({
      title: String(title),
      year: String(year),
    });

    const oRes = await fetch(`${ORACLE_BASE}/pamdor-resolve?${oParams.toString()}`, {
      headers: { 'User-Agent': 'Erodium-Edge-Proxy/1.0' },
      signal: AbortSignal.timeout(12000),
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

    return new Response(
      JSON.stringify({
        success: false,
        error: `Erreur serveur Pamdor (${oRes.status})`,
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
