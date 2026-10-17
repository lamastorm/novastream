export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const playPayload = {
      id: "3450",
      type: "tv",
      season: 1,
      episode: 1
    };

    const playRes = await fetch('https://skystream.fun/api/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://skystream.fun/serie/3450',
      },
      body: JSON.stringify(playPayload),
    });

    const playStatus = playRes.status;
    const playData = await playRes.json();

    let streamUrl = null;
    if (playData.fallbackUrl && playData.fallbackUrl.includes('token=')) {
      const token = new URL(playData.fallbackUrl, 'https://skystream.fun').searchParams.get('token');
      if (token) {
        const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = atob(b64);
        const payload = JSON.parse(jsonStr);
        streamUrl = payload.u;
      }
    }

    return new Response(JSON.stringify({ playStatus, streamUrl, playDataKeys: Object.keys(playData) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
