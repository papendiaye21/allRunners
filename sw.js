/* allRunners — installable app shell. Do not intercept requests.
   An earlier worker cached the page and turned live API calls into "failed to fetch". */
const CACHE = 'allrunners-v4'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})
