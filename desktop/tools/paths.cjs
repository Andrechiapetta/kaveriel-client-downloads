const path = require('node:path');
function paths() {
  const arch = process.env.KAVERIEL_BUILD_ARCH || process.arch;
  if (!['x64', 'arm64'].includes(arch)) throw new Error('Unsupported package architecture');
  const dir = process.platform === 'darwin' ? (arch === 'arm64' ? 'mac-arm64' : 'mac')
    : process.platform === 'win32' ? 'win-unpacked' : 'linux-unpacked';
  const base = path.resolve(__dirname, '../dist', dir);
  return { arch, asar: process.platform === 'darwin' ? path.join(base, 'Kaveriel.app/Contents/Resources/app.asar') : path.join(base, 'resources/app.asar'),
    exe: process.platform === 'darwin' ? path.join(base, 'Kaveriel.app/Contents/MacOS/Kaveriel') : path.join(base, process.platform === 'win32' ? 'Kaveriel.exe' : 'kaveriel-player') };
}
module.exports = paths;
