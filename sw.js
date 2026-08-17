// Pracownik serwisowy: to on sprawia, że Kompendium na telefonie działa bez
// internetu i samo się aktualizuje.
//
// Zasada jest jedna i wybrana świadomie: NAJPIERW SIEĆ, potem zapas.
// Odwrotnie (najpierw zapas) strona wstawałaby szybciej, ale pokazywałaby
// wczorajszą wersję programu, dopóki ktoś nie odświeżyłby jej dwa razy —
// a tu chodzi o to, żeby telefon dostawał nowe rzeczy sam z siebie.
// Gdy sieci nie ma, wchodzi zapas i wszystko działa jak dotąd.

const ZAPAS = 'kompendium-v1'

self.addEventListener('install', (e) => {
  // nowa wersja nie czeka w kolejce za starą kartą
  self.skipWaiting()
  e.waitUntil(caches.open(ZAPAS))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== ZAPAS) await caches.delete(k)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  e.respondWith(
    (async () => {
      const zapas = await caches.open(ZAPAS)
      try {
        const swieze = await fetch(req)
        if (swieze && swieze.status === 200) zapas.put(req, swieze.clone())
        return swieze
      } catch {
        const stary = await zapas.match(req)
        if (stary) return stary
        // wejście „na stronę" bez sieci i bez zapasu tej ścieżki — oddajemy
        // stronę główną, bo to aplikacja jednostronicowa
        if (req.mode === 'navigate') {
          const glowna = await zapas.match('./index.html')
          if (glowna) return glowna
        }
        throw new Error('brak sieci i brak zapasu')
      }
    })(),
  )
})
