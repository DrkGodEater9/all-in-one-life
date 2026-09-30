"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lightbulb, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { NONE, STATUS_COLUMNS, STATUS_LABEL } from "./constants";
import { InlineEdit } from "./InlineEdit";
import { ProjectLinks } from "./ProjectLinks";
import { ProjectNotes } from "./ProjectNotes";
import { StatusBadge } from "./StatusBadge";
import { TagPicker } from "./TagPicker";
import { ViabilityDot } from "./ViabilityDot";
import type {
  Project,
  ProjectCategory,
  ProjectLink,
  ProjectNote,
  ProjectStatus,
  ProjectTag,
} from "./types";
import { formatDate } from "./utils";

const NEW_CATEGORY = "__new__";

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function ProjectDetailClient({ projectId }: { projectId: number }) {
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .get<Project>(`/projects/${projectId}`)
      .then((data) => {
        if (!cancelled) setProject(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(
          e instanceof ApiClientError ? e.message : "No se pudo cargar el proyecto"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, tgs] = await Promise.all([
          api.get<ProjectCategory[]>("/projects/categories"),
          api.get<ProjectTag[]>("/projects/tags"),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setTags(tgs);
      } catch {
        // Catálogos accesorios.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tagNames = useMemo(
    () => (project ? project.tags.map((t) => t.tag.name) : []),
    [project]
  );

  /**
   * Parche con actualización optimista: aplica el cambio en local, manda el
   * PATCH y revierte + avisa si falla. Relanza el error para que la edición
   * inline restaure su valor.
   */
  async function patchProject(
    payload: Record<string, unknown>,
    optimistic: (current: Project) => Project,
    successTitle: string
  ) {
    if (!project) return;
    const snapshot = project;
    setProject(optimistic(project));

    try {
      const updated = await api.patch<Project>(`/projects/${projectId}`, payload);
      setProject(updated);
      toast({ title: successTitle });
    } catch (e) {
      setProject(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
      throw e;
    }
  }

  async function handleCategoryChange(value: string) {
    if (value === NEW_CATEGORY) {
      setCreatingCategory(true);
      return;
    }
    const categoryId = value === NONE ? null : Number(value);
    const nextCategory = categories.find((c) => c.id === categoryId) ?? null;
    await patchProject(
      { categoryId },
      (current) => ({ ...current, categoryId, category: nextCategory }),
      "Categoría actualizada"
    ).catch(() => undefined);
  }

  async function handleCreateCategory() {
    const name = newCategory.trim();
    if (!name) {
      setCreatingCategory(false);
      return;
    }
    try {
      const category = await api.post<ProjectCategory>("/projects/categories", { name });
      setCategories((prev) =>
        prev.some((c) => c.id === category.id)
          ? prev
          : [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewCategory("");
      setCreatingCategory(false);
      await patchProject(
        { categoryId: category.id },
        (current) => ({ ...current, categoryId: category.id, category }),
        "Categoría actualizada"
      ).catch(() => undefined);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la categoría",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
    }
  }

  async function handleTagsChange(next: string[]) {
    if (!project) return;
    const snapshot = project;
    // Optimista: se pintan los nombres nuevos con ids temporales negativos.
    setProject({
      ...project,
      tags: next.map((name, index) => {
        const known = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
        return {
          projectId: project.id,
          tagId: known?.id ?? -(index + 1),
          tag: known ?? { id: -(index + 1), name, createdAt: new Date().toISOString() },
        };
      }),
    });

    try {
      const updated = await api.patch<Project>(`/projects/${projectId}`, {
        tagNames: next,
      });
      setProject(updated);
      setTags((prev) => {
        const merged = [...prev];
        for (const assignment of updated.tags) {
          if (!merged.some((t) => t.id === assignment.tag.id)) merged.push(assignment.tag);
        }
        return merged.sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (e) {
      setProject(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudieron guardar las etiquetas",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
    }
  }

  async function handleAddNote(content: string) {
    const note = await api
      .post<ProjectNote>(`/projects/${projectId}/notes`, { content })
      .catch((e: unknown) => {
        toast({
          variant: "destructive",
          title: "No se pudo guardar la nota",
          description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
        });
        throw e;
      });

    setProject((current) =>
      current ? { ...current, notes: [note, ...current.notes] } : current
    );
    toast({ title: "Nota agregada" });
  }

  async function handleDeleteNote(noteId: number) {
    if (!project) return;
    const snapshot = project;
    setProject({ ...project, notes: project.notes.filter((n) => n.id !== noteId) });
    try {
      await api.delete(`/projects/${projectId}/notes/${noteId}`);
      toast({ title: "Nota borrada" });
    } catch (e) {
      setProject(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudo borrar la nota",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
    }
  }

  async function handleAddLink(values: { title: string | null; url: string }) {
    const link = await api
      .post<ProjectLink>(`/projects/${projectId}/links`, values)
      .catch((e: unknown) => {
        toast({
          variant: "destructive",
          title: "No se pudo guardar el link",
          description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
        });
        throw e;
      });

    setProject((current) =>
      current ? { ...current, links: [...current.links, link] } : current
    );
    toast({ title: "Link agregado" });
  }

  async function handleDeleteLink(linkId: number) {
    if (!project) return;
    const snapshot = project;
    setProject({ ...project, links: project.links.filter((l) => l.id !== linkId) });
    try {
      await api.delete(`/projects/${projectId}/links/${linkId}`);
      toast({ title: "Link borrado" });
    } catch (e) {
      setProject(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudo borrar el link",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
    }
  }

  async function handleDeleteProject() {
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}`);
      toast({ title: "Proyecto borrado" });
      router.push("/projects");
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo borrar el proyecto",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <DetailSkeleton />;

  if (loadError || !project) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Proyecto no disponible"
        description={loadError ?? "No encontramos este proyecto."}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/projects">Volver a proyectos</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Proyectos
      </Link>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <InlineEdit
              label="título del proyecto"
              value={project.title}
              maxLength={200}
              placeholder="Sin título"
              displayClassName="font-serif text-3xl leading-tight tracking-tight"
              onSave={(next) =>
                patchProject(
                  { title: next },
                  (current) => ({ ...current, title: next }),
                  "Título actualizado"
                )
              }
            />
            <p className="mt-1 px-0 text-[11px] text-text-3">
              Creado el {formatDate(project.createdAt)}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Borrar proyecto"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          {/* El semáforo solo aparece cuando hay viabilidad (null en fase 1). */}
          <ViabilityDot viability={project.viability} withLabel />
        </div>
      </header>

      <section className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select
            value={project.status}
            onValueChange={(value) =>
              void patchProject(
                { status: value },
                (current) => ({ ...current, status: value as ProjectStatus }),
                "Estado actualizado"
              ).catch(() => undefined)
            }
          >
            <SelectTrigger aria-label="Estado del proyecto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_COLUMNS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Categoría</Label>
          {creatingCategory ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nombre de la categoría"
                aria-label="Nueva categoría"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateCategory();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setCreatingCategory(false);
                    setNewCategory("");
                  }
                }}
              />
              <Button size="sm" onClick={() => void handleCreateCategory()}>
                Crear
              </Button>
            </div>
          ) : (
            <Select
              value={project.categoryId ? String(project.categoryId) : NONE}
              onValueChange={(value) => void handleCategoryChange(value)}
            >
              <SelectTrigger aria-label="Categoría del proyecto">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin categoría</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY}>+ Nueva categoría</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Etiquetas</Label>
          <TagPicker
            value={tagNames}
            onChange={(next) => void handleTagsChange(next)}
            suggestions={tags}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <Label className="mb-2 block">Descripción</Label>
        <InlineEdit
          multiline
          label="descripción del proyecto"
          value={project.description ?? ""}
          maxLength={5000}
          placeholder="Añade una descripción"
          displayClassName="text-sm leading-relaxed text-text-2"
          onSave={(next) =>
            patchProject(
              { description: next === "" ? null : next },
              (current) => ({ ...current, description: next === "" ? null : next }),
              "Descripción actualizada"
            )
          }
        />
      </section>

      <ProjectNotes
        notes={project.notes}
        onAdd={handleAddNote}
        onDelete={handleDeleteNote}
      />

      <ProjectLinks
        links={project.links}
        onAdd={handleAddLink}
        onDelete={handleDeleteLink}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Borrar proyecto</DialogTitle>
            <DialogDescription>
              Se borrarán también sus notas, links y etiquetas asignadas.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-text-2">{project.title}</p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDeleteProject()}
              disabled={deleting}
            >
              {deleting ? "Borrando..." : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
