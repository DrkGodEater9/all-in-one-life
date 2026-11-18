"use client";

import * as React from "react";
import { Briefcase, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { cn, toDateKey } from "@/lib/utils";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TONE,
  type ApplicationStatus,
} from "./constants";
import type { JobApplication, JobPortal } from "./types";

interface FormValues {
  company: string;
  position: string;
  url: string;
  source: string;
  status: ApplicationStatus;
  appliedAt: string;
  salary: string;
  notes: string;
}

function emptyForm(): FormValues {
  return {
    company: "",
    position: "",
    url: "",
    source: "",
    status: "postulado",
    appliedAt: toDateKey(),
    salary: "",
    notes: "",
  };
}

function errorMessage(e: unknown) {
  return e instanceof ApiClientError ? e.message : "Inténtalo de nuevo";
}

/** "2026-11-16" → "16 nov 2026" sin pasar por zonas horarias. */
function formatDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ApplicationDialog({
  open,
  initial,
  sources,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial: JobApplication | null;
  sources: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<FormValues>(emptyForm());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValues(
      initial
        ? {
            company: initial.company,
            position: initial.position,
            url: initial.url ?? "",
            source: initial.source ?? "",
            status: initial.status,
            appliedAt: initial.appliedAt,
            salary: initial.salary ?? "",
            notes: initial.notes ?? "",
          }
        : emptyForm()
    );
  }, [open, initial]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const canSubmit = values.company.trim() !== "" && values.position.trim() !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const body = {
        company: values.company.trim(),
        position: values.position.trim(),
        url: values.url.trim(),
        source: values.source.trim(),
        status: values.status,
        appliedAt: values.appliedAt || toDateKey(),
        salary: values.salary.trim(),
        notes: values.notes.trim(),
      };
      if (initial) await api.patch(`/jobs/applications/${initial.id}`, body);
      else await api.post("/jobs/applications", body);
      toast({ title: initial ? "Postulación actualizada" : "Postulación agregada" });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar la postulación",
        description: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar postulación" : "Nueva postulación"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="app-company">Empresa</Label>
                <Input
                  id="app-company"
                  value={values.company}
                  maxLength={200}
                  autoFocus
                  onChange={(e) => set("company", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-position">Cargo</Label>
                <Input
                  id="app-position"
                  value={values.position}
                  maxLength={200}
                  onChange={(e) => set("position", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={values.status}
                  onValueChange={(v) => set("status", v as ApplicationStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {APPLICATION_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-date">Fecha de postulación</Label>
                <Input
                  id="app-date"
                  type="date"
                  value={values.appliedAt}
                  onChange={(e) => set("appliedAt", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="app-source">Dónde te postulaste</Label>
                <Input
                  id="app-source"
                  list="app-sources"
                  placeholder="LinkedIn, Computrabajo, referido…"
                  value={values.source}
                  maxLength={80}
                  onChange={(e) => set("source", e.target.value)}
                />
                <datalist id="app-sources">
                  {sources.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-salary">Salario (opcional)</Label>
                <Input
                  id="app-salary"
                  placeholder="Ej: 5M COP"
                  value={values.salary}
                  maxLength={80}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-url">Enlace a la oferta</Label>
              <Input
                id="app-url"
                placeholder="https://…"
                value={values.url}
                onChange={(e) => set("url", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-notes">Notas</Label>
              <Textarea
                id="app-notes"
                rows={4}
                maxLength={5000}
                placeholder="Contacto, fecha de la entrevista, qué pidieron…"
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApplicationsTab({ reloadKey }: { reloadKey: number }) {
  const [items, setItems] = React.useState<JobApplication[]>([]);
  const [portals, setPortals] = React.useState<JobPortal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<ApplicationStatus | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<JobApplication | null>(null);

  const load = React.useCallback(() => {
    Promise.all([
      api.get<JobApplication[]>("/jobs/applications"),
      api.get<JobPortal[]>("/jobs/portals"),
    ])
      .then(([apps, ports]) => {
        setItems(apps);
        setPortals(ports);
      })
      .catch((error: unknown) =>
        toast({
          variant: "destructive",
          title: "No se pudieron cargar las postulaciones",
          description: errorMessage(error),
        })
      )
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load, reloadKey]);

  const sources = React.useMemo(() => {
    const set = new Set<string>(["LinkedIn", "Referido"]);
    for (const p of portals) set.add(p.name);
    for (const a of items) if (a.source) set.add(a.source);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [portals, items]);

  const counts = React.useMemo(() => {
    const c = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
      ApplicationStatus,
      number
    >;
    for (const a of items) c[a.status] += 1;
    return c;
  }, [items]);

  const inProcess = counts.postulado + counts.en_revision + counts.entrevista + counts.prueba;
  const visible = filter ? items.filter((a) => a.status === filter) : items;

  async function changeStatus(app: JobApplication, status: ApplicationStatus) {
    const snapshot = items;
    setItems((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      await api.patch(`/jobs/applications/${app.id}`, { status });
    } catch (error) {
      setItems(snapshot);
      toast({ variant: "destructive", title: "No se pudo cambiar el estado", description: errorMessage(error) });
    }
  }

  async function remove(app: JobApplication) {
    if (!window.confirm(`¿Eliminar la postulación a ${app.company} (${app.position})?`)) return;
    try {
      await api.delete(`/jobs/applications/${app.id}`);
      toast({ title: "Postulación eliminada" });
      load();
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Postulaciones", value: items.length },
          { label: "En proceso", value: inProcess },
          { label: "Entrevistas", value: counts.entrevista + counts.prueba },
          { label: "Ofertas", value: counts.oferta },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-3">
            <p className="font-mono text-2xl tabular-nums text-text">{s.value}</p>
            <p className="mt-0.5 text-xs text-text-2">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 rounded-sm border px-2.5 py-1 text-xs transition-colors",
              filter === null
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-border text-text-2 hover:text-text"
            )}
          >
            Todas ({items.length})
          </button>
          {APPLICATION_STATUSES.filter((s) => counts[s] > 0).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? null : s)}
              className={cn(
                "shrink-0 rounded-sm border px-2.5 py-1 text-xs transition-colors",
                filter === s
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-border text-text-2 hover:text-text"
              )}
            >
              {APPLICATION_STATUS_LABEL[s]} ({counts[s]})
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva postulación
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={filter ? "Ninguna postulación con ese estado" : "Aún no hay postulaciones"}
          description={
            filter
              ? "Quita el filtro para ver todas."
              : "Agrega cada trabajo al que apliques y ve cambiando su estado según avance."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((a) => (
            <li key={a.id} className="min-w-0 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words text-base leading-tight text-text">{a.company}</h3>
                  <p className="mt-0.5 break-words text-sm text-text-2">{a.position}</p>
                </div>
                <div className="flex shrink-0 items-center">
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir oferta de ${a.company}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-accent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${a.company}`}
                    onClick={() => {
                      setEditing(a);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${a.company}`}
                    onClick={() => void remove(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Select
                  value={a.status}
                  onValueChange={(v) => void changeStatus(a, v as ApplicationStatus)}
                >
                  <SelectTrigger className="h-8 w-auto gap-2 text-xs" aria-label={`Estado de ${a.company}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {APPLICATION_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant={APPLICATION_STATUS_TONE[a.status]}>
                  {APPLICATION_STATUS_LABEL[a.status]}
                </Badge>
                <span className="text-xs text-text-2">{formatDay(a.appliedAt)}</span>
                {a.source ? <Badge variant="outline">{a.source}</Badge> : null}
                {a.salary ? <span className="text-xs text-text-2">{a.salary}</span> : null}
              </div>

              {a.notes ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-2">{a.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ApplicationDialog
        open={dialogOpen}
        initial={editing}
        sources={sources}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />
    </div>
  );
}
