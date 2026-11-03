// Service worker: deixa o app funcionando sem internet.
// Ao publicar uma nova versão, aumente o número em VERSAO.

const VERSAO = 'v2';
const CACHE = `doce-engenho-${VERSAO}`;
const ARQUIVOS = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/ui.js',
  'js/db.js',
  'js/calc.js',
  'js/store.js',
  'js/defaults.js',
  'js/views/dashboard.js',
  'js/views/produto.js',
  'js/views/insumos.js',
  'js/views/ajustes.js',
  'js/views/material-form.js',
  'js/views/produto-form.js',
  'js/views/categorias.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('doce-engenho-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Arquivos do app: responde do cache e atualiza em segundo plano.
// Fontes do Google: guardadas no cache na primeira vez.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonte) return;

  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: url.origin === self.location.origin });
    const rede = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || rede;
  }));
});
