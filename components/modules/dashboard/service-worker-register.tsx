"use client";

import * as React from "react";

/**
 * Registra el Service Worker de la PWA (`public/sw.js`).
 *
 * Solo en producción: en desarrollo el HMR de Next reescribe los bundles
 * constantemente y un Service Worker cacheándolos serviría versiones viejas
 * del código. `navigator.serviceWorker` se comprueba antes de usarse porque
 * no existe en navegadores viejos ni en contextos no seguros (http sin TLS).
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const { serviceWorker } = navigator;
    serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("[pwa] no se pudo registrar el service worker", error);
    });
  }, []);

  return null;
}
