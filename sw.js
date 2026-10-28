// 인터넷 되면 항상 최신 파일을 받고, 안 되면(지하철 등) 핸드폰에 저장해 둔 파일로 열기
// 단어나 화면을 고치면 VERSION 숫자를 올린다
const VERSION = 'v10';
const FILES = ['./', 'index.html', 'words.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' — 브라우저에 남은 옛 파일 말고 서버에서 새로 받아 저장
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => c.put(f, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 발음 파일은 폰 브라우저가 직접 받게 둠 (아이폰은 소리 파일을 중간에서 건드리면 재생이 안 되는 경우가 있음)
  if (url.pathname.includes('/audio/')) return;
  if (url.origin === location.origin) {
    // 우리 파일: 인터넷 먼저, 실패하면 저장본
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
  } else {
    // 글꼴 등 바깥 파일: 저장본 먼저
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
      return res;
    })));
  }
});
