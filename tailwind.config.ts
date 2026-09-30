import type { Config } from "tailwindcss";

/**
 * Los tokens viven en globals.css como hex (`--color-accent: #7C6AF7`), no como
 * canales sueltos. Tailwind no sabe aplicar el modificador `/NN` a un `var()`
 * plano: descarta la clase en silencio y no emite CSS. Envolverlo en una función
 * con `opacityValue` nos deja seguir escribiendo `bg-accent/85` y que funcione.
 *
 * Bug real que estuvo en producción: cuando la clase se usa SIN modificador
 * (`bg-accent`, el 95% de los usos), Tailwind no llama con
 * `opacityValue: undefined` — llama con el placeholder de compatibilidad
 * `"var(--tw-bg-opacity)"` (para que utilidades legacy `bg-opacity-*` sigan
 * funcionando). `Number("var(--tw-bg-opacity)")` es `NaN`, así que el color
 * salía `color-mix(in srgb, var(--color-accent) NaN%, transparent)` — CSS
 * inválido, el navegador lo descarta y cae al estilo por defecto del
 * elemento. Por eso el botón "Entrar" salía blanco en vez de violeta: no es
 * un tema de diseño, faltaba esta validación.
 */
const token = (name: string) =>
  // Tailwind acepta funciones como valor de color en runtime, pero su tipo
  // `RecursiveKeyValuePair` solo admite strings. El cast mantiene el tipado del
  // resto de la config sin renunciar al comportamiento.
  ((({ opacityValue }: { opacityValue?: string }) => {
    const pct = opacityValue === undefined ? NaN : Number(opacityValue) * 100;
    return Number.isFinite(pct)
      ? `color-mix(in srgb, var(--color-${name}) ${pct}%, transparent)`
      : `var(--color-${name})`;
  }) as unknown) as string;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        border: token("border"),
        accent: {
          DEFAULT: token("accent"),
          soft: "var(--color-accent-soft)",
        },
        text: {
          DEFAULT: token("text"),
          2: token("text-2"),
          3: token("text-3"),
        },
        green: token("green"),
        yellow: token("yellow"),
        red: token("red"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        cat: {
          medical: token("cat-medical"),
          work: token("cat-work"),
          personal: token("cat-personal"),
          study: token("cat-study"),
        },
      },
      fontFamily: {
        // Instrument Serif se retiró del sistema visual a pedido del
        // usuario (se veía mal en cifras y tampoco convenció en títulos).
        // Todo el texto usa Inter; JetBrains Mono queda solo para números.
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Solo para Dialog: un keyframe que fija `transform` reemplaza POR
        // COMPLETO el transform del elemento durante la animación, así que
        // si el Dialog está centrado con `-translate-x-1/2 -translate-y-1/2`
        // (clases estáticas de Tailwind), ese centrado desaparece mientras
        // dura la animación y el modal se ve en la esquina superior
        // izquierda de su punto de anclaje (que cae en la esquina inferior
        // derecha de la pantalla) hasta que la animación termina y el
        // centrado estático vuelve a aplicar — el "salto" que se veía. Este
        // keyframe hornea el mismo translate(-50%,-50%) para que nunca se
        // pierda. No usar para nada que no esté centrado así (Toast, por
        // ejemplo, usa "scale-in" a secas).
        "dialog-scale-in": {
          from: { opacity: "0", transform: "translate(-50%, -50%) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 150ms ease-out",
        "accordion-up": "accordion-up 150ms ease-out",
        "fade-in": "fade-in 150ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
        "dialog-scale-in": "dialog-scale-in 150ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
