const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../app/policy.cjs');
test('only the exact public HTTPS origin can navigate or request network assets', () => {
  for (const url of ['http://kaveriel.com.br', 'https://kaveriel.com.br.evil.test', 'https://kaveriel.com.br:444/play', 'file:///etc/passwd', 'https://user@kaveriel.com.br/play', 'javascript:alert(1)']) assert.equal(p.onOrigin(url), false, url);
  assert.equal(p.onOrigin(p.START), true);
  assert.equal(p.resourceAllowed('wss://kaveriel.com.br/', 'webSocket'), true);
  assert.equal(p.resourceAllowed('wss://kaveriel.com.br/voice', 'webSocket'), true);
  assert.equal(p.resourceAllowed('ws://kaveriel.com.br/', 'webSocket'), false);
  assert.equal(p.resourceAllowed('wss://evil.test/', 'webSocket'), false);
  assert.equal(p.resourceAllowed('blob:https://kaveriel.com.br/id', 'script'), true);
  assert.equal(p.resourceAllowed('blob:https://evil.test/id', 'script'), false);
  assert.equal(p.resourceAllowed('data:text/html,test', 'mainFrame'), false);
  assert.equal(p.resourceAllowed('data:image/png,test', 'image'), true);
  assert.equal(p.externalLink('https://github.com/Andrechiapetta/kaveriel-client-downloads/releases/download/v1.0.0/Kaveriel-1.0.0-windows-x64.exe'), true);
  assert.equal(p.externalLink('https://github.com/Andrechiapetta/kaveriel-client-downloads/releases/download/v1.0.0/Kaveriel-1.0.0-linux-x86_64.AppImage'), true);
  assert.equal(p.externalLink('https://github.com/another/repo/releases/download/v1.0.0/evil.exe'), false);
});
test('microphone requests need exact-origin audio-only main-frame permission', () => {
  const audio = { mediaTypes: ['audio'], isMainFrame: true };
  assert.equal(p.mediaAllowed('media', p.START, audio), true);
  for (const details of [{}, { mediaTypes: ['video'] }, { mediaTypes: ['audio', 'video'] }, { ...audio, isMainFrame: false }]) assert.equal(p.mediaAllowed('media', p.START, details), false);
  assert.equal(p.mediaAllowed('media', 'https://evil.test', audio), false);
  assert.equal(p.mediaAllowed('display-capture', p.START, audio), false);
});
