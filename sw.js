// Service Worker：オフラインでも起動できるようにする（ねむりの庭の sw.js をもとに）
// - アプリのファイル：電波がないときはすぐキャッシュ。あるときはネットを取りに行き、3秒で返事がなければキャッシュ
//   （ねむりの庭では機内モードで iOS の「機内モードをオフに…」が出たため、オフラインならネットを試さない）
// - Google Fonts：一度取ったらキャッシュを使う
// ファイルを増やしたら APP に足し、VERSION を上げる
const VERSION = 'v1-2026-11-11b';
const APP_CACHE = 'kintore-app-' + VERSION, FONT_CACHE = 'kintore-fonts-v1';
const APP = [
  './', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './src/catalog.js', './src/fight.js', './src/main.js', './src/rules.js', './src/sleep-link.js', './src/state.js', './src/styles.css', './src/time.js',
  './src/art/fighter.js', './src/art/icon.js', './src/art/pixel.js', './src/art/ring.js', './src/art/room.js', './src/art/scene.js', './src/art/side.js', './src/art/wear.js',
  './src/ui/after.js', './src/ui/bout.js', './src/ui/dev.js', './src/ui/fight.js', './src/ui/home.js', './src/ui/log.js', './src/ui/prefs.js', './src/ui/record.js', './src/ui/sheet.js', './src/ui/shop.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kintore-app-') && k !== APP_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // フォント：キャッシュがあればそれ、なければ取ってきて入れる
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const c = await caches.open(APP_CACHE);
    const cached = () => c.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined));
    // 電波がないと分かっているときは、ネットを試さずにキャッシュ
    if (self.navigator && self.navigator.onLine === false) {
      const hit = await cached();
      if (hit) return hit;
    }
    // ネット優先（no-cache で取る）。3秒で返事がなく、キャッシュがあればそれ
    const net = (req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' }))
      .then(res => { if (res.ok) c.put(req, res.clone()); return res; });
    net.catch(() => {});
    try {
      const slow = new Promise(r => setTimeout(r, 3000, 'slow'));
      const first = await Promise.race([net, slow]);
      if (first !== 'slow') return first;
      return (await cached()) || await net;
    } catch (err) {
      const hit = await cached();
      if (hit) return hit;
      throw err;
    }
  })());
});
