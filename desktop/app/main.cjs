'use strict';
const { app, BrowserWindow, Menu, dialog, session, shell, systemPreferences } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const policy = require('./policy.cjs');

app.setName('Kaveriel');
app.enableSandbox();
const smoke = process.argv.includes('--kaveriel-smoke');
const offlineUrl = pathToFileURL(path.join(__dirname, 'offline.html')).href;
let window, closeConfirmed = false, closePending = false, microphoneAllowed = false;
let smokeDone = false;

function external(url) { if (policy.externalLink(url)) void shell.openExternal(url).catch(() => {}); }
function windowState() {
  try {
    const info = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'window.json'), 'utf8'));
    return { width: Math.max(1024, Math.min(3840, Number(info.width) || 1280)),
      height: Math.max(720, Math.min(2160, Number(info.height) || 900)), maximized: info.maximized !== false };
  } catch { return { width: 1280, height: 900, maximized: true }; }
}
function saveWindow() {
  if (!window || window.isDestroyed()) return;
  const size = window.getNormalBounds();
  try { fs.writeFileSync(path.join(app.getPath('userData'), 'window.json'), JSON.stringify({ width: size.width, height: size.height, maximized: window.isMaximized() }), { mode: 0o600 }); } catch { /* sizing cannot stop logout */ }
}
function installPermissions(ses) {
  ses.setPermissionCheckHandler((contents, permission, origin, details) => {
    if (contents !== window?.webContents || !policy.onOrigin(origin) || details.isMainFrame === false) return false;
    if (permission === 'media') return microphoneAllowed && details.mediaType === 'audio';
    return ['fullscreen', 'clipboard-sanitized-write', 'persistent-storage'].includes(permission);
  });
  ses.setPermissionRequestHandler(async (contents, permission, callback, details) => {
    try {
    if (contents !== window?.webContents || !policy.onOrigin(contents.getURL())) return callback(false);
    if (['fullscreen', 'clipboard-sanitized-write', 'persistent-storage'].includes(permission)
        && details.isMainFrame !== false && policy.onOrigin(details.requestingUrl)) return callback(true);
    if (!policy.mediaAllowed(permission, details.requestingUrl, details)) return callback(false);
    if (!microphoneAllowed) {
      const answer = await dialog.showMessageBox(window, { type: 'question', title: 'Microfone no Kaveriel',
        message: 'Permitir mensagens de áudio?', detail: 'O microfone será usado quando você gravar uma mensagem no jogo.',
        buttons: ['Permitir microfone', 'Agora não'], defaultId: 0, cancelId: 1 });
      if (answer.response !== 0 || window.isDestroyed() || !policy.onOrigin(contents.getURL())) return callback(false);
      if (process.platform === 'darwin' && !await systemPreferences.askForMediaAccess('microphone')) return callback(false);
      microphoneAllowed = true;
    }
    callback(true);
    } catch { callback(false); }
  });
  ses.setDevicePermissionHandler(() => false);
  ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  ses.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !policy.resourceAllowed(details.url, details.resourceType, offlineUrl) }));
}

async function flushProfileBeforeClose(contents) {
  if (!policy.onOrigin(contents.getURL())) return;
  let timeout;
  try {
    await Promise.race([
      // Only the public page's persistence callback runs; no native API or data
      // crosses this boundary. Older site releases have no callback yet.
      contents.executeJavaScript(`(() => {
        if (location.origin !== ${JSON.stringify(policy.ORIGIN)}) return;
        return typeof window.KaverielFlushProfile === 'function'
          ? window.KaverielFlushProfile() : undefined;
      })()`),
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('profile-flush-timeout')), 5000);
      })
    ]);
  } finally { clearTimeout(timeout); }
}

async function finishSmoke() {
  const deadline = Date.now() + 180000;
  while (!smokeDone && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (window.isDestroyed()) return;
    const result = await window.webContents.executeJavaScript(`(() => {
      const fs = typeof FS !== 'undefined' ? FS : null;
      return { origin: location.origin, stage: document.body.dataset.stage, isolated: crossOriginIsolated,
        wasm: typeof WebAssembly === 'object', audio: Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia),
        nodeExposed: typeof window.require !== 'undefined' || typeof window.process !== 'undefined',
        resident: Boolean(window.ResidentBridge || window.KaverielResident || fs?.analyzePath('/modules/game_kaveriel_resident').exists || fs?.analyzePath('/modules/game_resident_access').exists) };
    })()`).catch(() => null);
    if (result && ['login', 'characters', 'world'].includes(result.stage)) {
      const good = result.origin === policy.ORIGIN && result.isolated && result.wasm && result.audio && !result.nodeExposed && !result.resident;
      smokeDone = true;
      console.log('KAVERIEL_DESKTOP_SMOKE ' + JSON.stringify({ ...result, passed: good, packaged: app.isPackaged, version: app.getVersion() }));
      app.exit(good ? 0 : 1); return;
    }
  }
  if (!smokeDone) { smokeDone = true; console.error('KAVERIEL_DESKTOP_SMOKE timeout'); app.exit(1); }
}

function createWindow() {
  const state = windowState();
  const ses = session.fromPartition('persist:kaveriel-player');
  window = new BrowserWindow({ width: state.width, height: state.height, minWidth: 1024, minHeight: 720,
    title: 'Kaveriel', backgroundColor: '#0f1716', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { session: ses, nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false, webviewTag: false, devTools: false, navigateOnDragDrop: false } });
  installPermissions(ses);
  window.once('ready-to-show', () => { if (state.maximized) window.maximize(); window.show(); });
  window.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => { if (!policy.onOrigin(url) && url !== offlineUrl) { event.preventDefault(); external(url); } });
  window.webContents.on('will-redirect', (event, url) => { if (!policy.onOrigin(url)) event.preventDefault(); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('did-fail-load', (_event, code, _description, _url, mainFrame) => {
    if (mainFrame && code !== -3 && window.webContents.getURL() !== offlineUrl) void window.loadURL(offlineUrl);
  });
  window.webContents.on('did-finish-load', () => {
    if (window.webContents.getURL() !== policy.START) return;
    // App launch already expresses the player's intent to open the public engine.
    // No credentials, game packet API, native bridge or privileged preload is injected.
    void window.webContents.executeJavaScript(`document.getElementById('app-mode')?.setAttribute('hidden',''); document.getElementById('start')?.click();`).catch(() => {});
    if (smoke) void finishSmoke();
  });
  window.on('close', async event => {
    if (closeConfirmed || smoke) { saveWindow(); return; }
    event.preventDefault(); if (closePending) return; closePending = true;
    try {
      const answer = await dialog.showMessageBox(window, { type: 'question', title: 'Encerrar Kaveriel',
        message: 'Fechar o cliente?', detail: 'Para sair do mundo com segurança, use Deslogar dentro do jogo. Em battle, o personagem pode continuar online após fechar a janela.',
        buttons: ['Continuar jogando', 'Fechar cliente'], defaultId: 0, cancelId: 0 });
      if (answer.response !== 1 || window.isDestroyed()) return;
      try { await flushProfileBeforeClose(window.webContents); }
      catch {
        if (window.isDestroyed()) return;
        const unsaved = await dialog.showMessageBox(window, { type: 'warning', title: 'Configurações ainda não salvas',
          message: 'Não foi possível confirmar o salvamento das configurações.',
          detail: 'Continue jogando para tentar novamente ou feche sem guardar as alterações recentes. Fechar não salva o terreno explorado nesta sessão; use Deslogar dentro do jogo.',
          buttons: ['Continuar jogando', 'Fechar sem guardar alterações recentes'], defaultId: 0, cancelId: 0 });
        if (unsaved.response !== 1) return;
      }
      if (!window.isDestroyed()) { closeConfirmed = true; saveWindow(); window.close(); }
    } catch { /* Keep the window open if a confirmation cannot be shown. */ }
    finally { closePending = false; }
  });
  window.webContents.on('will-prevent-unload', event => { if (closeConfirmed) event.preventDefault(); });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'Kaveriel', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { label: 'Sair', accelerator: 'Cmd+Q', click: () => window.close() }] }] : []),
    // Select-all/undo accelerators would intercept Tibia's Ctrl+A/custom hotkeys.
    // Selection and undo belong to the game; keep only native clipboard actions.
    { label: 'Editar', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: 'Janela', submenu: [{ role: 'minimize' }, { role: 'togglefullscreen' }, { label: 'Fechar', accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Alt+F4', click: () => window.close() }] },
    { label: 'Kaveriel online', submenu: [{ label: 'Site e conta', click: () => external(policy.ORIGIN + '/conta') }, { label: 'Economia e regras', click: () => external(policy.ORIGIN + '/regras') },
      { label: 'Baixar versão atual', click: () => external(policy.ORIGIN + '/downloads') }, { label: 'Sobre o cliente', click: () => dialog.showMessageBox(window, { type: 'info', title: 'Kaveriel', message: 'Kaveriel ' + app.getVersion(), detail: 'Cliente web do jogador em uma janela própria para Mac. Não requer XQuartz.\nhttps://kaveriel.com.br' }) }] }
  ]));
  ses.on('will-download', (event, item) => { event.preventDefault(); external(item.getURL()); });
  void window.loadURL(policy.START);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => { if (window && !window.isDestroyed() && !closeConfirmed && !smoke) { event.preventDefault(); window.close(); } });
}
