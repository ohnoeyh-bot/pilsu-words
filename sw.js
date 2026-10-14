// 한 번 열면 인터넷 없이도(지하철 등) 열리도록 파일을 핸드폰에 저장해 둠
// 단어나 화면을 고치면 VERSION 숫자를 올려야 학생 폰에 새 버전이 반영됨
const VERSION = 'v3';
const FILES = ['./', 'index.html', 'words.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    // 글꼴 등 바깥 파일도 처음 받을 때 저장
    if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return res;
  })));
});
