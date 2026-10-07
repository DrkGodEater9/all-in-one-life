"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, Plus, Search } from "lucide-react";
import { api, ApiClientError, qs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { ALL, STATUS_COLUMNS, STATUS_LABEL } from "./constants";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectListCard } from "./ProjectCard";
import { ProjectsKanban } from "./ProjectsKanban";
import type { Project, ProjectCategory, ProjectStatus, ProjectTag } from "./types";

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5" />
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState("lista");
  const [status, setStatus] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [tag, setTag] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Catálogos: se cargan una vez.
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
        // Los catálogos son accesorios: si fallan, los filtros quedan vacíos.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Los filtros de status / categoría / tag se resuelven en el servidor.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const query = qs({
      status: status === ALL ? undefined : status,
      category: category === ALL ? undefined : category,
      tag: tag === ALL ? undefined : tag,
    });

    api
      .get<Project[]>(`/projects${query}`)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(
          e instanceof ApiClientError ? e.message : "No se pudieron cargar los proyectos"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, category, tag]);

  // La búsqueda se aplica en cliente para que escribir sea instantáneo.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) => {
      const haystack = [
        p.title,
        p.description ?? "",
        p.category?.name ?? "",
        ...p.tags.map((t) => t.tag.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [projects, search]);

  async function handleStatusChange(id: number, next: ProjectStatus) {
    const target = projects.find((p) => p.id === id);
    if (!target || target.status === next) return;
    const previousStatus = target.status;

    // Actualización optimista.
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: next } : p)));

    try {
      const updated = await api.patch<Project>(`/projects/${id}`, { status: next });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast({
        title: "Proyecto movido",
        description: `${target.title} → ${STATUS_LABEL[next]}`,
      });
    } catch (e) {
      // Reversión.
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: previousStatus } : p))
      );
      toast({
        variant: "destructive",
        title: "No se pudo mover el proyecto",
        description: e instanceof ApiClientError ? e.message : "Intenta de nuevo",
      });
    }
  }

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    if (project.category && !categories.some((c) => c.id === project.category?.id)) {
      setCategories((prev) =>
        [...prev, project.category as ProjectCategory].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    }
    const newTags = project.tags
      .map((t) => t.tag)
      .filter((t) => !tags.some((existing) => existing.id === t.id));
    if (newTags.length) {
      setTags((prev) =>
        [...prev, ...newTags].sort((a, b) => a.name.localeCompare(b.name))
      );
    }
  }

  const hasFilters =
    status !== ALL || category !== ALL || tag !== ALL || search.trim() !== "";

  return (
    <div className="space-y-5">
      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next);
          // El kanban muestra las 5 columnas: filtrar por estado no tiene sentido.
          if (next === "kanban") setStatus(ALL);
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
            </TabsList>

            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo proyecto</span>
              <span className="sr-only sm:hidden">Nuevo proyecto</span>
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={200}
                placeholder="Buscar proyecto"
                className="pl-9"
                aria-label="Buscar proyecto"
              />
            </div>

            {tab === "lista" ? (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="sm:w-44" aria-label="Filtrar por estado">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los estados</SelectItem>
                  {STATUS_COLUMNS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por categoría">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por etiqueta">
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las etiquetas</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatus(ALL);
                  setCategory(ALL);
                  setTag(ALL);
                  setSearch("");
                }}
              >
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <ListSkeleton />
          ) : loadError ? (
            <EmptyState
              icon={Lightbulb}
              title="No se pudieron cargar los proyectos"
              description={loadError}
            />
          ) : (
            <>
              <TabsContent value="lista" className="mt-0">
                {visible.length === 0 ? (
                  <EmptyState
                    icon={Lightbulb}
                    title={
                      hasFilters ? "Ningún proyecto coincide" : "Sin proyectos todavía"
                    }
                    description={
                      hasFilters
                        ? "Prueba con otros filtros o limpia la búsqueda."
                        : "Anota esa idea que llevas dando vueltas."
                    }
                    action={
                      hasFilters ? null : (
                        <Button size="sm" onClick={() => setDialogOpen(true)}>
                          <Plus className="h-4 w-4" />
                          Nuevo proyecto
                        </Button>
                      )
                    }
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((project) => (
                      <ProjectListCard key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="kanban" className="mt-0">
                <ProjectsKanban
                  projects={visible}
                  onStatusChange={handleStatusChange}
                />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        tags={tags}
        onCreated={handleCreated}
      />
    </div>
  );
}
