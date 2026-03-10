const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
};

function safeJoin(rootDir, pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const target = path.join(rootDir, normalized);
  if (!target.startsWith(rootDir)) {
    return rootDir;
  }
  return target;
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function createStaticServer(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const requestPath = req.url || '/';
    let filePath = safeJoin(resolvedRoot, requestPath === '/' ? '/index.html' : requestPath);

    if (!fileExists(filePath)) {
      const asIndex = path.join(filePath, 'index.html');
      if (fileExists(asIndex)) {
        filePath = asIndex;
      } else {
        const fallback = path.join(resolvedRoot, 'index.html');
        if (fileExists(fallback)) {
          filePath = fallback;
        }
      }
    }

    if (!fileExists(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind desktop static server'));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

module.exports = {
  createStaticServer,
};
