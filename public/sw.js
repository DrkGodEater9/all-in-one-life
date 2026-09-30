/**
 * Service Worker de Personal OS — cache básico de assets estáticos.
 *
 * Reglas:
 *  - Cache-first SOLO para assets estáticos del propio origen (JS/CSS de
 *    `_next/static`, iconos, manifest, favicon).
 *  - Network-only para todo lo que empiece por `/api/`: cachear la API
 *    mostraría datos obsoletos (saldo, tareas, eventos...) y rompería el
 *    login, que depende de la sesión de Supabase en cada request.
 *  - El nombre del cache va versionado; `activate` borra los caches de
 *    versiones anteriores.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `personal-os-static-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
  "/icons/apple-touch-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Si el precache falla (offline en el primer install, etc.) no
        // bloqueamos la instalación: el cache-first de abajo sigue
        // funcionando bajo demanda para lo que sí logre pedirse.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("personal-os-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAssetPath(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    /\.(?:js|css|woff2?|svg|png|jpg|jpeg|gif|ico)$/.test(pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nunca interceptar peticiones a otros orígenes (Supabase, fuentes, etc.).
  if (url.origin !== self.location.origin) return;

  // Network-only: la API nunca se cachea.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (!isStaticAssetPath(url.pathname)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
