"use client";

import * as React from "react";
import { Briefcase, Plus } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { toDateKey } from "@/lib/utils";
import {
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
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABEL, type ApplicationStatus } from "./constants";
import { ApplicationsKanban } from "./ApplicationsKanban";
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

      <div className="flex justify-end">
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
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aún no hay postulaciones"
          description="Agrega cada trabajo al que apliques y arrástralo entre columnas según avance."
        />
      ) : (
        <ApplicationsKanban
          apps={items}
          onSetStatus={changeStatus}
          onEdit={(app) => {
            setEditing(app);
            setDialogOpen(true);
          }}
          onDelete={(app) => void remove(app)}
        />
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
