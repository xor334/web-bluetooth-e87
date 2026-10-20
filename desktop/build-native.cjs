const { execFileSync } = require('node:child_process');
const { mkdirSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
if (process.platform === 'darwin') {
  const source = path.join(__dirname, 'mac-discovery.swift');
  const out = path.join(__dirname, 'bin');
  const binary = path.join(out, 'mac-badge-discovery');
  if (!existsSync(binary) || statSync(binary).mtimeMs < statSync(source).mtimeMs) {
    mkdirSync(out, { recursive: true });
    for (const arch of ['arm64', 'x86_64']) {
      execFileSync('xcrun', ['swiftc', '-O', '-target', `${arch}-apple-macos12.0`, source, '-o', path.join(out, `discovery-${arch}`)], { stdio: 'inherit' });
    }
    execFileSync('lipo', ['-create', path.join(out, 'discovery-arm64'), path.join(out, 'discovery-x86_64'), '-output', binary], { stdio: 'inherit' });
    console.log('macOS address discovery built (universal).');
  }
}
