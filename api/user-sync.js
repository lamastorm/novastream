import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users-db.json');

let usersDb = {
  users: {}, // userId (normalized email) -> { id, email, name, picture, pin, watchlist, history, playbackPositions, updatedAt }
  pins: {},  // 4-digit pin -> userId
};

function loadDb() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        usersDb = { users: {}, pins: {}, ...parsed };
      }
    }
  } catch (e) {
    console.warn('[UserSync] Init DB:', e.message);
  }
}

loadDb();

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf8');
    } catch (e) {
      console.error('[UserSync] Save error:', e.message);
    }
  }, 500);
}

function generateUniquePin(userId) {
  // Check if user already has a pin
  const existing = usersDb.users[userId]?.pin;
  if (existing && usersDb.pins[existing] === userId) return existing;

  for (let i = 0; i < 100; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    if (!usersDb.pins[pin] || usersDb.pins[pin] === userId) {
      usersDb.pins[pin] = userId;
      return pin;
    }
  }
  const fallback = crypto.createHash('md5').update(userId).digest('hex').slice(0, 4).toUpperCase();
  usersDb.pins[fallback] = userId;
  return fallback;
}

function mergeListsById(cloudList = [], localList = []) {
  const map = new Map();
  // Local items first, then cloud items sorted by most recent
  const combined = [...(Array.isArray(localList) ? localList : []), ...(Array.isArray(cloudList) ? cloudList : [])];
  combined.sort((a, b) => {
    const tA = new Date(a?.watchedAt || a?.addedAt || 0).getTime() || 0;
    const tB = new Date(b?.watchedAt || b?.addedAt || 0).getTime() || 0;
    return tB - tA;
  });
  for (const item of combined) {
    if (!item || !item.id) continue;
    const key = `${item.id}_${item.media_type || (item.title ? 'movie' : 'tv')}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function mergePlaybackPositions(cloudPos = {}, localPos = {}) {
  const result = { ...(cloudPos || {}) };
  for (const [k, v] of Object.entries(localPos || {})) {
    if (!v || typeof v !== 'object') continue;
    const existing = result[k];
    if (!existing || (v.updatedAt || 0) >= (existing.updatedAt || 0)) {
      result[k] = v;
    }
  }
  return result;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query?.action || 'get';

  try {
    // 1. GET user data
    if (req.method === 'GET' && action === 'get') {
      const userId = String(req.query?.userId || '').trim().toLowerCase();
      if (!userId || !usersDb.users[userId]) {
        return res.status(404).json({ success: false, error: 'Compte introuvable' });
      }
      const u = usersDb.users[userId];
      return res.status(200).json({
        success: true,
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          picture: u.picture,
          pin: u.pin,
        },
        data: {
          watchlist: u.watchlist || [],
          history: u.history || [],
          playbackPositions: u.playbackPositions || {},
          updatedAt: u.updatedAt || Date.now(),
        },
      });
    }

    const body = await readJsonBody(req);

    const GOOGLE_CLIENT_ID = '715880740963-mofbtrjh9t2g8n3lduon4gqka0r7fg10.apps.googleusercontent.com';

    // 2. LOGIN / REGISTER via Official Google OAuth JWT or 4-digit Xbox PIN
    if (action === 'login' || action === 'google') {
      let email = '';
      let name = '';
      let picture = '';
      const pinInput = String(body.pin || '').trim();

      // Mode A: 4-digit Xbox / TV PIN code
      if (pinInput && !body.credential) {
        const matchedUserId = usersDb.pins[pinInput];
        if (!matchedUserId || !usersDb.users[matchedUserId]) {
          return res.status(400).json({
            success: false,
            error: 'Code Xbox / TV invalide. Connectez-vous d’abord avec Google sur votre PC ou téléphone pour obtenir votre code à 4 chiffres.',
          });
        }
        email = matchedUserId;
      }

      // Mode B: Official Google OAuth 2.0 JWT ID Token verification
      if (body.credential) {
        const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`);
        if (!gRes.ok) {
          return res.status(401).json({
            success: false,
            error: 'Jeton Google invalide ou expiré. Veuillez réessayer.',
          });
        }
        const gData = await gRes.json();
        if (gData.aud !== GOOGLE_CLIENT_ID || !gData.email) {
          return res.status(401).json({
            success: false,
            error: 'Identifiant client OAuth Google non autorisé.',
          });
        }
        email = gData.email.toLowerCase();
        name = gData.name || gData.given_name || email.split('@')[0];
        picture = gData.picture || '';
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'Veuillez vous connecter avec le bouton officiel Google ou saisir votre code Xbox à 4 chiffres.',
        });
      }

      const existing = usersDb.users[email] || {};
      const pin = existing.pin || generateUniquePin(email);
      usersDb.pins[pin] = email;

      const displayName = name || existing.name || email.split('@')[0];
      const avatarUrl =
        picture ||
        existing.picture ||
        `https://api.dicebear.com/7.x/Initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=ea580c`;

      const mergedWatchlist = mergeListsById(existing.watchlist, body.watchlist);
      const mergedHistory = mergeListsById(existing.history, body.history).slice(0, 40);
      const mergedPositions = mergePlaybackPositions(existing.playbackPositions, body.playbackPositions);

      const userRecord = {
        id: email,
        email,
        name: displayName,
        picture: avatarUrl,
        pin,
        watchlist: mergedWatchlist,
        history: mergedHistory,
        playbackPositions: mergedPositions,
        updatedAt: Date.now(),
      };

      usersDb.users[email] = userRecord;
      scheduleSave();

      return res.status(200).json({
        success: true,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          picture: userRecord.picture,
          pin: userRecord.pin,
        },
        data: {
          watchlist: userRecord.watchlist,
          history: userRecord.history,
          playbackPositions: userRecord.playbackPositions,
          updatedAt: userRecord.updatedAt,
        },
      });
    }

    // 3. SAVE / SYNC user data
    if (action === 'save') {
      const userId = String(body.userId || body.email || '').trim().toLowerCase();
      if (!userId || !usersDb.users[userId]) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const existing = usersDb.users[userId];
      if (Array.isArray(body.watchlist)) {
        existing.watchlist = body.replaceWatchlist
          ? body.watchlist
          : mergeListsById(existing.watchlist, body.watchlist);
      }
      if (Array.isArray(body.history)) {
        existing.history = (body.replaceHistory
          ? body.history
          : mergeListsById(existing.history, body.history)
        ).slice(0, 40);
      }
      if (body.playbackPositions && typeof body.playbackPositions === 'object') {
        existing.playbackPositions = mergePlaybackPositions(existing.playbackPositions, body.playbackPositions);
      }
      existing.updatedAt = Date.now();
      scheduleSave();

      return res.status(200).json({
        success: true,
        data: {
          watchlist: existing.watchlist,
          history: existing.history,
          playbackPositions: existing.playbackPositions,
          updatedAt: existing.updatedAt,
        },
      });
    }

    return res.status(400).json({ success: false, error: 'Action non reconnue' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
