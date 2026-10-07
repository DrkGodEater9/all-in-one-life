import { z } from "zod";
import type { UseFormRegisterReturn } from "react-hook-form";

/** Máximo de dígitos enteros: las columnas son Decimal(12, n). */
export const MAX_MONEY = 9_999_999_999;
export const MAX_QUANTITY = 99_999_999;

/**
 * Deja solo dígitos y UN separador decimal (acepta coma o punto), y recorta
 * los decimales. Bloquea letras, 'e', '+', '-' y cualquier símbolo.
 */
export function sanitizeDecimal(value: string, maxDecimals = 2, maxIntDigits = 10): string {
  const normalized = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const firstDot = normalized.indexOf(".");
  if (firstDot === -1) return normalized.slice(0, maxIntDigits);
  const int = normalized.slice(0, firstDot).slice(0, maxIntDigits);
  const dec = normalized
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, maxDecimals);
  return maxDecimals === 0 ? int : `${int}.${dec}`;
}

/** Solo letras (con acentos y ñ), espacios, apóstrofe y guion. */
export function sanitizeLetters(value: string): string {
  return value.replace(/[^\p{L}\s'’-]/gu, "");
}

function filtered(
  reg: UseFormRegisterReturn,
  clean: (value: string) => string
): UseFormRegisterReturn {
  return {
    ...reg,
    onChange: (event) => {
      const target = event.target as HTMLInputElement;
      const next = clean(target.value);
      if (next !== target.value) target.value = next;
      return reg.onChange(event);
    },
  };
}

/** Props para un campo decimal: texto con teclado numérico y filtrado al escribir. */
export function decimalField(reg: UseFormRegisterReturn, maxDecimals = 2, maxIntDigits = 10) {
  return {
    ...filtered(reg, (v) => sanitizeDecimal(v, maxDecimals, maxIntDigits)),
    type: "text" as const,
    inputMode: (maxDecimals === 0 ? "numeric" : "decimal") as "numeric" | "decimal",
    autoComplete: "off",
  };
}

/** Props para un campo de solo letras. */
export function lettersField(reg: UseFormRegisterReturn) {
  return { ...filtered(reg, sanitizeLetters), autoComplete: "off" };
}

const DECIMAL_RE = (d: number) => new RegExp(`^\d+(\.\d{1,${d}})?$`);

/**
 * Esquema para un número escrito como texto. `required` exige valor;
 * `min` es el mínimo exclusivo si `positive`, inclusivo si no.
 */
export function numberText(opts: {
  label: string;
  required?: boolean;
  positive?: boolean;
  max?: number;
  decimals?: number;
}) {
  const { label, required = true, positive = true, max = MAX_MONEY, decimals = 2 } = opts;
  return z.string().superRefine((raw, ctx) => {
    const v = raw.trim();
    if (v === "") {
      if (required) ctx.addIssue({ code: "custom", message: `Indica ${label}` });
      return;
    }
    if (!DECIMAL_RE(decimals).test(v)) {
      ctx.addIssue({
        code: "custom",
        message: decimals === 0 ? "Escribe solo números" : `Escribe un número válido (máx. ${decimals} decimales)`,
      });
      return;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Escribe un número válido" });
    } else if (positive && n <= 0) {
      ctx.addIssue({ code: "custom", message: "Debe ser mayor que cero" });
    } else if (n > max) {
      ctx.addIssue({ code: "custom", message: "El valor es demasiado grande" });
    }
  });
}

/** Persona/entidad: solo letras, espacios, apóstrofe y guion. */
export const personSchema = z
  .string()
  .trim()
  .min(1, "Indica la persona")
  .max(120)
  .regex(/^[\p{L}\s'’-]+$/u, "Usa solo letras");
