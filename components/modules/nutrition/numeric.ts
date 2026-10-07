/**
 * Filtros para inputs numéricos de texto (inputMode numeric/decimal).
 * Se aplican en onChange: dejan solo dígitos y, si aplica, un separador decimal.
 */
export function sanitizeInteger(value: string, maxLength = 6): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function sanitizeDecimal(value: string, maxDecimals = 1, maxInt = 4): string {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const [intPart = "", ...rest] = cleaned.split(".");
  const int = intPart.slice(0, maxInt);
  if (rest.length === 0) return int;
  return `${int}.${rest.join("").slice(0, maxDecimals)}`;
}
