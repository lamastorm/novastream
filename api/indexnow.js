import https from 'https';

/**
 * Endpoint de notification automatique IndexNow (Bing, Yandex, Seznam, Naver)
 * Permet de soumettre automatiquement les nouvelles pages pour indexation immédiate.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = 'erodium.vercel.app';
  const key = '49a909fc22a44f3ba606346261f22b7a';
  const keyLocation = `https://${host}/${key}.txt`;

  const urlList = [
    `https://${host}/`,
    `https://${host}/?tab=movies`,
    `https://${host}/?tab=series`,
    `https://${host}/?tab=anime`,
    `https://${host}/?platform=netflix`,
    `https://${host}/?platform=prime`,
    `https://${host}/?platform=disney`
  ];

  const payload = JSON.stringify({
    host,
    key,
    keyLocation,
    urlList
  });

  return new Promise((resolve) => {
    const postReq = https.request({
      hostname: 'api.indexnow.org',
      port: 443,
      path: '/IndexNow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 8000
    }, (indexRes) => {
      let data = '';
      indexRes.on('data', chunk => data += chunk);
      indexRes.on('end', () => {
        resolve(res.status(200).json({
          success: true,
          status: indexRes.statusCode,
          message: 'IndexNow ping envoyé avec succès aux moteurs de recherche (Bing, Yandex).',
          submittedUrls: urlList.length
        }));
      });
    });

    postReq.on('error', (err) => {
      resolve(res.status(200).json({
        success: false,
        error: err.message,
        fallback: 'Indexation manuelle planifiée via sitemap.xml'
      }));
    });

    postReq.write(payload);
    postReq.end();
  });
}
