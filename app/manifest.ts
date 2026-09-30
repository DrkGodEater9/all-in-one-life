import type { MetadataRoute } from "next";

/**
 * Metadata route de Next 14: se sirve en `/manifest.webmanifest` (ya
 * referenciado desde `app/layout.tsx` vía `metadata.manifest`, que no se
 * toca en este cambio).
 *
 * Iconos: no hay herramientas de generación de imágenes disponibles en este
 * entorno, así que los iconos son SVG (`public/icons/*.svg`) en vez de PNG.
 * Chrome/Edge/Android instalan bien la PWA con `type: "image/svg+xml"`, pero
 * para compatibilidad máxima con iOS (que en la práctica todavía espera
 * PNG/ICO en varios flujos) conviene generar también PNG de 192×192 y
 * 512×512 más adelante con una herramienta de imagen real.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal OS",
    short_name: "Personal OS",
    description: "Finanzas, salud, productividad y proyectos en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F11",
    theme_color: "#0F0F11",
    lang: "es",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
