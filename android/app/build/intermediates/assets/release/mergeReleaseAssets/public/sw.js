const HTML_PATH = './index.html';

const PRECACHE = [
  HTML_PATH,
  './manifest.json',
  './stitches.js',
  './styles.css',
  // Core JS modules — must precache for offline bootstrap
  './js/main.js',
  './js/render.js',
  './js/stitch.js',
  './js/round.js',
  './js/part.js',
  './js/project.js',
  './js/image.js',
  './js/share.js',
  './js/share-pattern.js',
  './js/annotator.js',
  './js/i18n.js',
  './js/voice-intent.js',
  './js/utils.js',
  './js/state.js',
  './js/storage.js',
  './js/ui.js',
  './js/voice.js',
  './js/settings.js',
  './js/pattern.js',
  // Locales
  './js/locales/en.js',
  './js/locales/zh.js',
  './js/locales/terms.js',
  // Libraries
  './lib/tesseract.min.js',
  './lib/html2canvas.min.js'
];

async function getVersionFromHtml() {
  try {
    const resp = await fetch(HTML_PATH, { cache: 'no-cache' });
    const text = await resp.text();
    const match = text.match(/<meta\s+name=["']version["']\s+content=["']([^"']+)["']\s*>/i);
    return match ? match[1] : 'v1';
  } catch {
    return 'v1';
  }
}

let CACHE_NAME = 'crochet-1.136';

self.addEventListener('install', (e) => {
  e.waitUntil(
    getVersionFromHtml().then((ver) => {
      CACHE_NAME = `crochet-${ver}`;
      return caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(PRECACHE));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // 清除所有旧缓存（无论名称），确保无残留文件
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      // 重建当前版本缓存
      return caches.open(CACHE_NAME)
        .then(cache => cache.addAll(PRECACHE))
        .catch(() => {});
    }).then(() => {
      self.clients.claim();
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
    })
  );
});

// ── 缓存策略 ──
// HTML：网络优先（确保总是拿到最新版本）
// 其他资源：缓存优先，后台更新
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 只处理 http/https 请求，跳过 chrome-extension:// 等不可缓存协议
  if (!url.protocol.startsWith('http')) return;

  // 只缓存 GET 请求
  if (request.method !== 'GET') return;

  // 对主 HTML 使用网络优先
  if (request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((resp) => {
          if (resp.ok && !resp.bodyUsed) {
            try {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            } catch (err) {
              console.warn('[SW] skip caching HTML:', err.message);
            }
          }
          return resp;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(HTML_PATH)))
    );
    return;
  }

  // 其他资源：缓存优先，后台回源更新
  e.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((resp) => {
          if (resp.ok && resp.type === 'basic' && !resp.bodyUsed) {
            try {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            } catch (err) {
              console.warn('[SW] skip caching asset:', err.message);
            }
          }
          return resp;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
