const CACHE = "data-science-quiz-v10";
const LOCAL = ["./", "./index.html", "./quiz.html", "./manage.html", "./edit.html", "./styles.css", "./quiz.js", "./cards.js", "./cards-ru.js", "./card-store.js", "./cloud-sync.js", "./supabase-config.js", "./home.js", "./manage.js", "./edit.js", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  if (!sameOrigin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
