import type { ApplicationStatus, PortalStatus } from "./constants";

export interface JobPortal {
  id: number;
  name: string;
  url: string | null;
  account: string | null;
  status: PortalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: number;
  company: string;
  position: string;
  url: string | null;
  source: string | null;
  status: ApplicationStatus;
  /** "YYYY-MM-DD" */
  appliedAt: string;
  salary: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function errorDescription(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Inténtalo de nuevo";
}
