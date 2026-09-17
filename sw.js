// CORTEX aba - service worker: instalacao (PWA) + notificacoes push
// Nao guarda dados clinicos em cache: so o casco do app, e sempre tenta a rede primeiro.
const VERSAO = 'cortex-aba-v1';
const CASCO = ['./', './index.html', './app.html', './manifest.json', './icones/icone-192.png', './icones/icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCO)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))));
  self.clients.claim();
});
// rede primeiro; cache so como reserva para o casco quando estiver sem internet
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: 'CORTEX aba', corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'CORTEX aba', {
    body: d.corpo || '', icon: './icones/icone-192.png', badge: './icones/icone-192.png',
    tag: d.tag || 'cortex', renotify: true, data: { url: d.url || './app.html' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './app.html', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    const aberta = lista.find(c => c.url.startsWith(self.location.origin));
    if (aberta) { aberta.focus(); if ('navigate' in aberta) aberta.navigate(url); return; }
    return self.clients.openWindow(url);
  }));
});
