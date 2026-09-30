/** Formas que devuelve la API de proyectos (fechas ya serializadas a ISO string). */

export const PROJECT_STATUSES = [
  "idea",
  "en_progreso",
  "pausado",
  "descartado",
  "completado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_VIABILITIES = ["muy_viable", "viable", "poco_viable"] as const;

export type ProjectViability = (typeof PROJECT_VIABILITIES)[number];

export interface ProjectCategory {
  id: number;
  name: string;
  createdAt: string;
}

export interface ProjectTag {
  id: number;
  name: string;
  createdAt: string;
}

export interface ProjectTagAssignment {
  projectId: number;
  tagId: number;
  tag: ProjectTag;
}

export interface ProjectNote {
  id: number;
  projectId: number;
  content: string;
  createdAt: string;
}

export interface ProjectLink {
  id: number;
  projectId: number;
  title: string | null;
  url: string;
  createdAt: string;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  status: ProjectStatus;
  /** Siempre null en fase 1 — la UI oculta el semáforo cuando lo es. */
  viability: ProjectViability | null;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
  category: ProjectCategory | null;
  tags: ProjectTagAssignment[];
  notes: ProjectNote[];
  links: ProjectLink[];
}
