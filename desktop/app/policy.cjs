'use strict';
const ORIGIN = 'https://kaveriel.com.br';
const START = ORIGIN + '/play';

function onOrigin(value) {
  try { const url = new URL(value); return url.origin === ORIGIN && !url.username && !url.password; }
  catch { return false; }
}
function externalLink(value) {
  if (onOrigin(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.port === '' && url.hostname === 'github.com'
      && /^\/Andrechiapetta\/kaveriel-client-downloads\/releases\/download\/v\d+\.\d+\.\d+\/Kaveriel-[a-zA-Z0-9._-]+$/.test(url.pathname);
  } catch { return false; }
}
function resourceAllowed(url, type, offlineUrl) {
  if (onOrigin(url) || url === 'about:blank' || url === offlineUrl) return true;
  // Game and audio use the public gateway's secure WebSocket transport.
  if (url.startsWith('wss:') && onOrigin('https:' + url.slice(4))) return true;
  if (url.startsWith('blob:')) return onOrigin(url.slice(5));
  return url.startsWith('data:') && ['image', 'font', 'media'].includes(type);
}
function mediaAllowed(permission, origin, details = {}) {
  return permission === 'media' && onOrigin(origin) && details.isMainFrame !== false
    && Array.isArray(details.mediaTypes) && details.mediaTypes.length === 1 && details.mediaTypes[0] === 'audio';
}
module.exports = { ORIGIN, START, onOrigin, externalLink, resourceAllowed, mediaAllowed };
