// 阿系喲播放器的離線快取
// 做法：「有新版就用新版」——先試著向網站拿最新的檔案；
// 如果沒有網路，才用存在電腦裡的版本，所以離線也能使用。
var CACHE = 'ashiyo-v2';
var PAGE = './';
var FILES = [PAGE, './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(f, { cache: 'no-store' }).then(function (res) { if (res.ok) return c.put(f, res); });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

// 啟用新版時，把舊版的快取刪掉
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  e.respondWith(caches.open(CACHE).then(function (cache) {
    // 字型很少變動：先用快取
    if (isFont) {
      return cache.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { cache.put(req, res.clone()); return res; });
      });
    }
    // 播放器本身：先拿最新的（不使用瀏覽器暫存），拿不到才用快取
    return fetch(req, { cache: 'no-store' }).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || cache.match(PAGE);
      });
    });
  }));
});
