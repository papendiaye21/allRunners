/* allRunners — minimal offline shell (cache-first for same-origin navigations). */
const CACHE = 'allrunners-v1'
const PRECACHE = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/').then((cached) => cached || new Response('Offline — start the Flask server.', { status: 503 }))
      )
    )
    return
  }
})
