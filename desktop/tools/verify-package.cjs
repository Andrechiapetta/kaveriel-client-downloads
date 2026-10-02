const fs = require('node:fs');
const asar = require('@electron/asar');
const { getCurrentFuseWire, FuseV1Options } = require('@electron/fuses');
const assert = require('node:assert/strict');
const paths = require('./paths.cjs');
(async () => {
  const p = paths();
  const files = asar.listPackage(p.asar).map(s => s.replaceAll('\\', '/'));
  const allowed = new Set(['/app', '/app/main.cjs', '/app/policy.cjs', '/app/offline.html', '/app/icon.png', '/package.json']);
  assert.deepEqual(new Set(files), allowed, 'package must contain only the explicitly reviewed player app files');
  const fuses = await getCurrentFuseWire(p.exe);
  // Fuse wire uses ASCII states: 48 = disabled, 49 = enabled.
  for (const key of ['RunAsNode', 'EnableNodeOptionsEnvironmentVariable', 'EnableNodeCliInspectArguments', 'GrantFileProtocolExtraPrivileges']) assert.equal(fuses[FuseV1Options[key]], 48, key + ' must be disabled');
  assert.equal(fuses[FuseV1Options.OnlyLoadAppFromAsar], 49);
  assert.equal(fuses[FuseV1Options.EnableEmbeddedAsarIntegrityValidation], 49);
  const proof = { playerOnly: true, files, fuses, platform: process.platform, arch: p.arch };
  fs.writeFileSync('dist/package-verification.json', JSON.stringify(proof, null, 2));
  console.log('Player-only package verified; privileged Electron flags disabled.');
})().catch(e => { console.error(e); process.exit(1); });
