self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('tanulo-app-cache').then((cache) => {
      return cache.addAll([
        '/login.html',
        '/register.html',
        '/create.html',
        '/manage.html',
        '/learn.html',
        '/style.css',
        '/script-login.js',
        '/script-register.js',
        '/script-create.js',
        '/script-manage.js',
        '/script-learn.js',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
