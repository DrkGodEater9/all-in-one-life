import type { Config } from "tailwindcss";

/**
 * Los tokens viven en globals.css como hex (`--color-accent: #7C6AF7`), no como
 * canales sueltos. Tailwind no sabe aplicar el modificador `/NN` a un `var()`
 * plano: descarta la clase en silencio y no emite CSS. Envolverlo en una función
 * con `opacityValue` nos deja seguir escribiendo `bg-accent/85` y que funcione.
 */
const token = (name: string) =>
  // Tailwind acepta funciones como valor de color en runtime, pero su tipo
  // `RecursiveKeyValuePair` solo admite strings. El cast mantiene el tipado del
  // resto de la config sin renunciar al comportamiento.
  ((({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `var(--color-${name})`
      : `color-mix(in srgb, var(--color-${name}) ${Number(opacityValue) * 100}%, transparent)`) as unknown) as string;

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
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "ui-serif", "Georgia", "serif"],
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
      },
      animation: {
        "accordion-down": "accordion-down 150ms ease-out",
        "accordion-up": "accordion-up 150ms ease-out",
        "fade-in": "fade-in 150ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
