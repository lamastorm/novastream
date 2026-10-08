import { app, BrowserWindow, session, ipcMain, shell } from 'electron';
import path from 'path';
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

  // 1. Bloquer toutes les requêtes vers les domaines de pub
  defaultSession.webRequest.onBeforeRequest(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const url = details.url.toLowerCase();

      // Vérifier si l'URL correspond à un domaine ou motif de pub
      const isAd =
        AD_DOMAINS.some((domain) => {
          const clean = domain.replace(/\*/g, '').replace('://', '');
          return url.includes(clean);
        }) ||
        AD_URL_PATTERNS.some((pattern) => url.includes(pattern));

      if (isAd) {
        // Bloqué net au niveau du protocole HTTP/HTTPS !
        return callback({ cancel: true });
      }

      callback({ cancel: false });
    }
  );

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
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Activer le mode plein écran immersif avec F11
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  return mainWindow;
}

// Optimisations GPU et accélération matérielle au lancement
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Activer l'upscaling vidéo par IA Chromium si disponible (Nvidia RTX VSR / Intel / AMD)
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,D3D11VideoDecoder');

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
