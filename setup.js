const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DIST = path.join(__dirname, 'web-worker');
const CPU = (process.env.PROCESSOR_ARCHITECTURE || process.arch || '').toLowerCase();
const IS_ARM = CPU.includes('arm');
const CDN = 'https://cdn.jsdelivr.net/gh/XTLS/Xray-core@main';
const DIRECT = 'https://github.com/XTLS/Xray-core/releases/download/';
const TAG = process.env.XRAY_TAG || 'v25.11.21';
const FILE = IS_ARM ? 'Xray-linux-arm64-v8a.zip' : 'Xray-linux-64.zip';

function httpGet(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        req.destroy();
        return httpGet(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => ws.close(resolve));
      ws.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function main() {
  if (fs.existsSync(DIST)) { console.log('web-worker exists'); return; }
  const tmp = path.join('/tmp', 'xray-' + Date.now() + '.zip');
  const directUrl = `${DIRECT}${TAG}/${FILE}`;
  try {
    console.log('downloading Xray from', directUrl);
    await httpGet(directUrl, tmp);
  } catch (e) {
    const cdnUrl = `${CDN}/releases/download/${TAG}/${FILE}`;
    console.log('direct failed, trying CDN', cdnUrl);
    await httpGet(cdnUrl, tmp);
  }
  execSync(`unzip -o "${tmp}" -d /tmp/xray-extract && cp /tmp/xray-extract/xray "${DIST}" && chmod +x "${DIST}"`, { stdio: 'inherit' });
  fs.unlinkSync(tmp);
  console.log('web-worker installed');
}
main().catch((e) => { console.error(e); process.exit(1); });
