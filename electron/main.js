import { app, BrowserWindow, session, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Liste des filtres et domaines publicitaires / trackers à bloquer au niveau réseau
const AD_DOMAINS = [
  '*://*.adservice.google.com/*',
  '*://*.doubleclick.net/*',
  '*://*.googlesyndication.com/*',
  '*://*.popads.net/*',
  '*://*.popcash.net/*',
  '*://*.adcash.com/*',
  '*://*.exoclick.com/*',
  '*://*.propellerads.com/*',
  '*://*.adsterra.com/*',
  '*://*.bet365.com/*',
  '*://*.1xbet.com/*',
  '*://*.onclickbright.com/*',
  '*://*.trafficjunky.com/*',
  '*://*.tsyndicate.com/*',
  '*://*.ad-maven.com/*',
  '*://*.monetag.com/*',
  '*://*.hilltopads.com/*',
  '*://*.clickadu.com/*',
  '*://*.coinhive.com/*',
  '*://*.rtmark.net/*',
];

// Patterns d'URLs de pop-ups publicitaires connus dans les lecteurs vidéo
const AD_URL_PATTERNS = [
  '/ad/',
  '/ads/',
  '/banner/',
  '/popunder/',
  '/popup/',
  'deliver.html',
  'serving.sys',
  'track.php',
];

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#000000',
    title: 'Erodium — Streaming Ultime Sans Pub',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Accélération matérielle et super-résolution vidéo
      backgroundThrottling: false,
    },
  });

  // Configurer le bouclier réseau anti-pub & anti-tracker sur toutes les requêtes (iframes comprises)
  const defaultSession = session.defaultSession;

  // 1. Bloquer uniquement les vrais scripts de trackers/pubs externes sans casser les players
  defaultSession.webRequest.onBeforeRequest(
    { urls: ['*://*/*', 'file://*/*'] },
    (details, callback) => {
      const url = details.url.toLowerCase();

      // Rediriger les flux relatifs du proxy HLS vers le serveur distant
      if (details.url.includes('/api/hls-proxy')) {
        const idx = details.url.indexOf('/api/hls-proxy');
        const proxyPath = details.url.substring(idx);
        return callback({ redirectURL: `https://erodium.vercel.app${proxyPath}` });
      }

      // Ne JAMAIS bloquer les serveurs de streaming légitimes ni leurs flux vidéo
      if (
        url.includes('frembed.') ||
        url.includes('autoembed.') ||
        url.includes('anyembed.') ||
        url.includes('vidsrc.') ||
        url.includes('2embed.') ||
        url.includes('m3u8') ||
        url.includes('.ts') ||
        url.includes('.mp4') ||
        url.includes('tmdb') ||
        url.includes('themoviedb')
      ) {
        return callback({ cancel: false });
      }

      const isAd =
        AD_DOMAINS.some((domain) => {
          const clean = domain.replace(/\*/g, '').replace('://', '');
          return url.includes(clean);
        });

      if (isAd) {
        return callback({ cancel: true });
      }

      callback({ cancel: false });
    }
  );

  // 2. Débloquer les restrictions de Referer que les hébergeurs vérifient
  defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;
    const url = details.url;

    // Forcer un User-Agent de navigateur Chrome légitime pour que l'API de streaming et VidMoly ne bloquent pas
    requestHeaders['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    // Simuler le referer légitime accepté par chaque hébergeur
    if (url.includes('frembed.') || url.includes('vidmoly.')) {
      requestHeaders['Referer'] = 'https://erodium.vercel.app/';
      requestHeaders['Origin'] = 'https://erodium.vercel.app';
    } else if (url.includes('autoembed.')) {
      requestHeaders['Referer'] = 'https://autoembed.co/';
      requestHeaders['Origin'] = 'https://autoembed.co';
    } else if (url.includes('anyembed.')) {
      requestHeaders['Referer'] = 'https://anyembed.xyz/';
      requestHeaders['Origin'] = 'https://anyembed.xyz';
    } else if (url.includes('erodium.vercel.app')) {
      requestHeaders['Referer'] = 'https://erodium.vercel.app/';
    }

    callback({ requestHeaders });
  });

  // 3. Supprimer X-Frame-Options et CSP bloquants sur les iframes des hébergeurs
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Supprimer les en-têtes qui empêchent les hébergeurs de s'afficher dans une iframe locale
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];

    callback({ responseHeaders });
  });

  // 2. Interdire STRICTEMENT l'ouverture de nouvelles fenêtres / pop-ups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Si c'est un lien externe légitime (TMDB, YouTube, Cloudflare), on l'ouvre dans le navigateur par défaut
    if (
      url.includes('themoviedb.org') ||
      url.includes('youtube.com') ||
      url.includes('1.1.1.1')
    ) {
      shell.openExternal(url);
    }
    // Tous les autres pop-ups (pubs d'hébergeurs) sont rejetés et détruits
    return { action: 'deny' };
  });

  // 3. Charger l'application
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('Failed to load:', code, desc);
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`);
  });

  const isPackaged = app.isPackaged;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (!isPackaged && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    // Dans l'application packagée ou lancée directement sur les fichiers de build
    const distPath = path.join(__dirname, '../dist/index.html');
    const rootPath = path.join(__dirname, '../index.html');
    const directPath = path.join(__dirname, 'index.html');
    const finalPath = fs.existsSync(distPath)
      ? distPath
      : fs.existsSync(rootPath)
      ? rootPath
      : directPath;

    mainWindow.loadFile(finalPath).catch((err) => {
      console.error('Erreur chargement index.html:', err);
    });
  }

  // Activer le mode plein écran immersif avec F11 et DevTools avec F12
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  return mainWindow;
}

// Activer le décodage vidéo fluide et désactiver le sandbox Windows bloquant sur les répertoires utilisateur
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
