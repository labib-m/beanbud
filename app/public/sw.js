// Bean Bud service worker. Its only job is push notifications:
//  - a "push" event arrives when the send-push Edge Function sends one
//  - a "notificationclick" opens (or focuses) the app at the relevant page
// It does not cache anything or work offline; that is a separate feature.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: 'Bean Bud', body: '', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // Not JSON (shouldn't happen, send-push always sends JSON): show something rather than nothing.
    data.body = event.data ? event.data.text() : ''
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const target = new URL(url, self.location.origin).href
      for (const client of clientsList) {
        if (client.url === target && 'focus' in client) return client.focus()
      }
      // Same-app but different page: focus the tab, then navigate it.
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) return client.navigate(target)
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })(),
  )
})
