const CACHE = "data-science-quiz-v7";
const LOCAL = ["./", "./index.html", "./quiz.html", "./manage.html", "./edit.html", "./styles.css", "./quiz.js", "./cards.js", "./card-store.js", "./cloud-sync.js", "./supabase-config.js", "./home.js", "./manage.js", "./edit.js", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  })));
});
