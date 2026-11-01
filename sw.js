// የጋራ መኪና PWA Service Worker
const CACHE = 'car-share-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // የዳታቤዝ እና የኢሜል ጥሪዎች ሁልጊዜ በቀጥታ ከኢንተርኔት
  if (/firebaseio\.com|googleapis\.com\/identitytoolkit|emailjs\.com/.test(url.hostname + url.pathname)) return;

  // ገጹ ራሱ፡ መጀመሪያ ኢንተርኔት፣ ከሌለ ከካሽ (ዝማኔ በቀላሉ እንዲደርስ)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ሌሎች (ስታይል፣ ፎንት፣ ስክሪፕት፣ አይከን)፡ ከካሽ መጀመሪያ፣ ከጀርባ ማዘመን
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
