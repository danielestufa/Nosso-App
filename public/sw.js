// Service worker do Nosso App: recebe e abre notificações

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = { titulo: 'Nosso App', corpo: event.data ? event.data.text() : '' }
  }

  const titulo = dados.titulo || 'Nosso App'
  const opcoes = {
    body: dados.corpo || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: dados.url || '/' },
  }
  if (dados.tag) opcoes.tag = dados.tag

  event.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          try { await janela.navigate(url) } catch {}
          return janela.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
