import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: es });
  } catch {
    return "";
  }
}

export function formatDateTime(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: es });
  } catch {
    return "";
  }
}

export function formatRelative(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { locale: es, addSuffix: true });
  } catch {
    return "";
  }
}

/** Hostname legible de un link, para mostrar debajo del título. */
export function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
