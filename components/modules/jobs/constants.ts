/** Estados de una postulación, en el orden del proceso. */
export const APPLICATION_STATUSES = [
  "postulado",
  "en_revision",
  "entrevista",
  "prueba",
  "oferta",
  "rechazado",
  "sin_respuesta",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  postulado: "Postulado",
  en_revision: "En revisión",
  entrevista: "Entrevista",
  prueba: "Prueba técnica",
  oferta: "Oferta",
  rechazado: "Rechazado",
  sin_respuesta: "Sin respuesta",
};

export type BadgeTone = "default" | "neutral" | "success" | "warning" | "danger";

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  postulado: "neutral",
  en_revision: "default",
  entrevista: "warning",
  prueba: "warning",
  oferta: "success",
  rechazado: "danger",
  sin_respuesta: "neutral",
};

export const PORTAL_STATUSES = ["pendiente", "cuenta_creada", "perfil_completo"] as const;
export type PortalStatus = (typeof PORTAL_STATUSES)[number];

export const PORTAL_STATUS_LABEL: Record<PortalStatus, string> = {
  pendiente: "Por crear",
  cuenta_creada: "Cuenta creada",
  perfil_completo: "Perfil completo",
};

export const PORTAL_STATUS_TONE: Record<PortalStatus, BadgeTone> = {
  pendiente: "neutral",
  cuenta_creada: "warning",
  perfil_completo: "success",
};

// ── Kanban de postulaciones ───────────────────────────────────────────────
/** Las tres columnas del tablero; cada una agrupa varios estados detallados. */
export const KANBAN_COLUMNS = ["en_curso", "pasaste", "no_pasaste"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const KANBAN_COLUMN_LABEL: Record<KanbanColumn, string> = {
  en_curso: "En curso",
  pasaste: "Pasaste",
  no_pasaste: "No pasaste",
};

export const KANBAN_COLUMN_EMPTY: Record<KanbanColumn, string> = {
  en_curso: "Sin postulaciones en proceso",
  pasaste: "Aquí van las ofertas",
  no_pasaste: "Rechazos y sin respuesta",
};

export const KANBAN_COLUMN_COLOR: Record<KanbanColumn, string> = {
  en_curso: "var(--color-accent)",
  pasaste: "var(--color-success)",
  no_pasaste: "var(--color-danger)",
};

export function statusColumn(status: ApplicationStatus): KanbanColumn {
  if (status === "oferta") return "pasaste";
  if (status === "rechazado" || status === "sin_respuesta") return "no_pasaste";
  return "en_curso";
}

/** Estado que toma una postulación al soltarla en una columna distinta. */
export const COLUMN_DROP_STATUS: Record<KanbanColumn, ApplicationStatus> = {
  en_curso: "en_revision",
  pasaste: "oferta",
  no_pasaste: "rechazado",
};
