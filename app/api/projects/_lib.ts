import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound } from "@/lib/http";

/** Valores exactos del schema (español). */
export const PROJECT_STATUSES = [
  "idea",
  "en_progreso",
  "pausado",
  "descartado",
  "completado",
] as const;

/** Fase 1: siempre null. Se deja soportado para que fase 2 lo llene. */
export const PROJECT_VIABILITIES = ["muy_viable", "viable", "poco_viable"] as const;

export const statusSchema = z.enum(PROJECT_STATUSES);
export const viabilitySchema = z.enum(PROJECT_VIABILITIES);

export const titleSchema = z.string().trim().min(1, "El título es obligatorio").max(200);
export const descriptionSchema = z.string().trim().max(5000);
export const tagNameSchema = z.string().trim().min(1).max(50);
export const categoryNameSchema = z.string().trim().min(1).max(60);
export const urlSchema = z.string().trim().url("URL inválida").max(2000);

/** Todo lo que el cliente necesita de un proyecto, siempre en la misma forma. */
export const projectInclude = {
  category: true,
  tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
  notes: { orderBy: { createdAt: "desc" } },
  links: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ProjectInclude;

type Db = Prisma.TransactionClient;

/** Convierte los searchParams en un objeto plano, ignorando valores vacíos. */
export function queryObject(searchParams: URLSearchParams) {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (value !== "") out[key] = value;
  });
  return out;
}

export function parseId(value: string | string[] | undefined, label = "id") {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) throw badRequest(`${label} inválido`);
  return id;
}

export function emptyToNull(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const projectFiltersSchema = z.object({
  status: statusSchema.optional(),
  /** id numérico o nombre de la categoría */
  category: z.string().trim().min(1).optional(),
  /** id numérico o nombre del tag */
  tag: z.string().trim().min(1).optional(),
  /** búsqueda libre sobre título y descripción */
  q: z.string().trim().min(1).optional(),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

function asPositiveInt(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function projectWhere(filters: ProjectFilters): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};

  if (filters.status) where.status = filters.status;

  if (filters.category) {
    const id = asPositiveInt(filters.category);
    if (id !== null) where.categoryId = id;
    else where.category = { name: { equals: filters.category, mode: "insensitive" } };
  }

  if (filters.tag) {
    const id = asPositiveInt(filters.tag);
    where.tags = {
      some:
        id !== null
          ? { tagId: id }
          : { tag: { name: { equals: filters.tag, mode: "insensitive" } } },
    };
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function assertProjectExists(db: Db, id: number) {
  const project = await db.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) throw notFound("Proyecto no encontrado");
}

export async function assertCategoryExists(db: Db, id: number) {
  const category = await db.projectCategory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!category) throw badRequest("La categoría no existe");
}

/** Nombres únicos (sin distinguir mayúsculas), conservando el primero escrito. */
function dedupeNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Resuelve la lista final de tagIds a partir de ids existentes y/o nombres.
 * Los nombres que todavía no existan se crean.
 */
export async function resolveTagIds(
  db: Db,
  tagIds?: number[],
  tagNames?: string[]
): Promise<number[]> {
  const ids = new Set<number>();

  if (tagIds?.length) {
    const unique = Array.from(new Set(tagIds));
    const found = await db.projectTag.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) throw badRequest("Alguna etiqueta no existe");
    found.forEach((t) => ids.add(t.id));
  }

  for (const name of dedupeNames(tagNames ?? [])) {
    const existing = await db.projectTag.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      ids.add(existing.id);
      continue;
    }
    const createdTag = await db.projectTag.create({ data: { name }, select: { id: true } });
    ids.add(createdTag.id);
  }

  return Array.from(ids);
}

/** Reemplaza por completo las asignaciones de tags de un proyecto. */
export async function replaceTagAssignments(db: Db, projectId: number, tagIds: number[]) {
  await db.projectTagAssignment.deleteMany({ where: { projectId } });
  if (tagIds.length) {
    await db.projectTagAssignment.createMany({
      data: tagIds.map((tagId) => ({ projectId, tagId })),
    });
  }
}

export function findProject(id: number) {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
}
