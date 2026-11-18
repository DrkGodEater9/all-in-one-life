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
