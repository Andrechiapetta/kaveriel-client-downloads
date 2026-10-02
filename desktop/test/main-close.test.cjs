const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../app/policy.cjs');

function harness({ flush, responses = [1], origin = policy.START } = {}) {
  const handlers = {}, contentsHandlers = {}, prompts = [], timers = new Map();
  let timerId = 0, closed = 0, called = 0, prevented = 0;
  const page = { location: { origin: new URL(origin).origin }, window: {} };
  if (flush) page.window.KaverielFlushProfile = () => { called++; return flush(); };
  const contents = {
    getURL: () => origin,
    on: (name, callback) => { contentsHandlers[name] = callback; },
    setWindowOpenHandler() {},
    executeJavaScript: code => Promise.resolve().then(() => vm.runInNewContext(code, page))
  };
  const ses = {
    on() {}, webRequest: { onBeforeRequest() {} },
    setPermissionCheckHandler(callback) { this.check = callback; },
    setPermissionRequestHandler(callback) { this.request = callback; },
    setDevicePermissionHandler() {}, setDisplayMediaRequestHandler() {}
  };
  const browserWindow = {
    webContents: contents,
    on: (name, callback) => { handlers[name] = callback; }, once() {},
    isDestroyed: () => false, isMaximized: () => false,
    getNormalBounds: () => ({ width: 1280, height: 900 }),
    loadURL: () => Promise.resolve(), close: () => { closed++; }
  };
  const electron = {
    app: { setName() {}, enableSandbox() {}, getPath: () => '/unused-unit-profile',
      requestSingleInstanceLock: () => false, quit() {} },
    BrowserWindow: function () { return browserWindow; },
    Menu: { buildFromTemplate: value => value, setApplicationMenu() {} },
    dialog: { showMessageBox: async (_window, options) => {
      prompts.push(options); return { response: responses.shift() ?? 0 };
    } },
    session: { fromPartition: () => ses }, shell: { openExternal: async () => {} },
    systemPreferences: { askForMediaAccess: async () => true }
  };
  const context = vm.createContext({
    __dirname: path.resolve(__dirname, '../app'), process: { argv: [], platform: 'darwin' }, console,
    require(name) {
      if (name === 'electron') return electron;
      if (name === './policy.cjs') return policy;
      if (name === 'node:fs') return { readFileSync() { throw new Error('no saved size'); }, writeFileSync() {} };
      return require(name);
    },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../app/main.cjs'), 'utf8'), context);
  vm.runInContext('createWindow()', context);
  return {
    close: () => handlers.close({ preventDefault: () => { prevented++; } }),
    contents, ses, prompts, timers,
    state: () => ({ closed, called, prevented }),
    timeout() {
      const entry = [...timers.values()].find(timer => timer.delay === 5000);
      assert.ok(entry, 'close must have a 5-second limit'); entry.callback();
    },
    permitsUnload() {
      let allowed = false;
      contentsHandlers['will-prevent-unload']({ preventDefault: () => { allowed = true; } });
      return allowed;
    }
  };
}

async function until(predicate) {
  for (let i = 0; i < 20 && !predicate(); i++) await Promise.resolve();
  assert.ok(predicate(), 'expected close handler to reach the profile flush');
}

test('close waits for the page commit and ignores a second close request while pending', async () => {
  let commit;
  const h = harness({ flush: () => new Promise(resolve => { commit = resolve; }) });
  const closing = h.close();
  await until(() => h.state().called === 1);
  assert.equal(h.state().closed, 0);
  assert.equal(h.permitsUnload(), false);
  await h.close();
  assert.equal(h.prompts.length, 1);
  commit(); await closing;
  assert.equal(h.state().closed, 1);
  assert.equal(h.permitsUnload(), true);
  assert.equal(h.timers.size, 0);
});

test('failed commit keeps the app open by default and permits another close attempt', async () => {
  const h = harness({ flush: () => Promise.reject(new Error('disk failure')), responses: [1, 0, 0] });
  await h.close();
  assert.equal(h.state().closed, 0);
  assert.equal(h.prompts[1].defaultId, 0);
  assert.equal(h.prompts[1].cancelId, 0);
  assert.equal(h.permitsUnload(), false);
  await h.close();
  assert.equal(h.prompts.length, 3);
  assert.equal(h.timers.size, 0);
});

test('player can explicitly close after a rejected commit', async () => {
  const h = harness({ flush: () => Promise.reject(new Error('disk failure')), responses: [1, 1] });
  await h.close();
  assert.equal(h.prompts.length, 2);
  assert.equal(h.state().closed, 1);
  assert.equal(h.permitsUnload(), true);
});

test('a stalled commit reaches the timeout prompt without closing by default', async () => {
  const h = harness({ flush: () => new Promise(() => {}), responses: [1, 0] });
  const closing = h.close();
  await until(() => h.state().called === 1);
  h.timeout(); await closing;
  assert.equal(h.prompts.length, 2);
  assert.equal(h.state().closed, 0);
  assert.equal(h.timers.size, 0);
});

test('old public pages without the callback still close after confirmation', async () => {
  const h = harness(); await h.close();
  assert.equal(h.prompts.length, 1);
  assert.equal(h.state().closed, 1);
});

test('the main process never invokes a callback outside the public origin', async () => {
  const h = harness({ origin: 'https://untrusted.example/', flush: () => Promise.reject(new Error('unexpected')) });
  await h.close();
  assert.equal(h.state().called, 0);
  assert.equal(h.state().closed, 1);
});

test('persistent storage is granted only to the exact-origin main page in this window', async () => {
  const h = harness();
  const details = { requestingUrl: policy.START, isMainFrame: true };
  assert.equal(h.ses.check(h.contents, 'persistent-storage', policy.ORIGIN, details), true);
  assert.equal(h.ses.check(h.contents, 'persistent-storage', 'https://untrusted.example', details), false);
  assert.equal(h.ses.check({}, 'persistent-storage', policy.ORIGIN, details), false);
  assert.equal(h.ses.check(h.contents, 'persistent-storage', policy.ORIGIN, { ...details, isMainFrame: false }), false);
  let granted;
  await h.ses.request(h.contents, 'persistent-storage', value => { granted = value; }, details);
  assert.equal(granted, true);
  for (const denied of [{ ...details, requestingUrl: 'https://untrusted.example/' }, { ...details, isMainFrame: false }]) {
    await h.ses.request(h.contents, 'persistent-storage', value => { granted = value; }, denied);
    assert.equal(granted, false);
  }
  await h.ses.request(h.contents, 'display-capture', value => { granted = value; }, details);
  assert.equal(granted, false);
});
