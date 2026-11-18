"use client";

import * as React from "react";
import { ExternalLink, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
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
  PORTAL_STATUSES,
  PORTAL_STATUS_LABEL,
  PORTAL_STATUS_TONE,
  type PortalStatus,
} from "./constants";
import type { JobPortal } from "./types";

/** Sugerencias de portales comunes (LinkedIn va aparte: ya lo manejas). */
const SUGGESTIONS = [
  "Computrabajo",
  "Indeed",
  "elempleo",
  "Magneto",
  "Glassdoor",
  "Get on Board",
  "Torre",
  "Wellfound",
  "RemoteOK",
  "We Work Remotely",
  "Workana",
];

interface FormValues {
  name: string;
  url: string;
  account: string;
  status: PortalStatus;
  notes: string;
}

const EMPTY: FormValues = { name: "", url: "", account: "", status: "pendiente", notes: "" };

function errorMessage(e: unknown) {
  return e instanceof ApiClientError ? e.message : "Inténtalo de nuevo";
}

function PortalDialog({
  open,
  initial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial: JobPortal | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<FormValues>(EMPTY);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValues(
      initial
        ? {
            name: initial.name,
            url: initial.url ?? "",
            account: initial.account ?? "",
            status: initial.status,
            notes: initial.notes ?? "",
          }
        : EMPTY
    );
  }, [open, initial]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: values.name.trim(),
        url: values.url.trim(),
        account: values.account.trim(),
        status: values.status,
        notes: values.notes.trim(),
      };
      if (initial) await api.patch(`/jobs/portals/${initial.id}`, body);
      else await api.post("/jobs/portals", body);
      toast({ title: initial ? "Portal actualizado" : "Portal agregado" });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar el portal",
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
          <DialogTitle>{initial ? "Editar portal" : "Nuevo portal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="portal-name">Nombre</Label>
              <Input
                id="portal-name"
                list="portal-suggestions"
                placeholder="Ej: Computrabajo"
                value={values.name}
                maxLength={80}
                autoFocus
                onChange={(e) => set("name", e.target.value)}
              />
              <datalist id="portal-suggestions">
                {SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-url">Enlace a tu perfil o al portal</Label>
              <Input
                id="portal-url"
                placeholder="https://…"
                value={values.url}
                onChange={(e) => set("url", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-account">Correo o usuario con el que te registraste</Label>
              <Input
                id="portal-account"
                placeholder="No guardes contraseñas aquí"
                value={values.account}
                maxLength={200}
                onChange={(e) => set("account", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={values.status} onValueChange={(v) => set("status", v as PortalStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PORTAL_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-notes">Notas</Label>
              <Textarea
                id="portal-notes"
                rows={3}
                maxLength={2000}
                placeholder="Qué falta del perfil, alertas configuradas…"
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={saving || !values.name.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PortalsTab({ onChanged }: { onChanged?: () => void }) {
  const [portals, setPortals] = React.useState<JobPortal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<JobPortal | null>(null);

  const load = React.useCallback(() => {
    api
      .get<JobPortal[]>("/jobs/portals")
      .then(setPortals)
      .catch((error: unknown) =>
        toast({
          variant: "destructive",
          title: "No se pudieron cargar los portales",
          description: errorMessage(error),
        })
      )
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function changeStatus(portal: JobPortal, status: PortalStatus) {
    const snapshot = portals;
    setPortals((prev) => prev.map((p) => (p.id === portal.id ? { ...p, status } : p)));
    try {
      await api.patch(`/jobs/portals/${portal.id}`, { status });
    } catch (error) {
      setPortals(snapshot);
      toast({ variant: "destructive", title: "No se pudo cambiar el estado", description: errorMessage(error) });
    }
  }

  async function remove(portal: JobPortal) {
    if (!window.confirm(`¿Eliminar el portal "${portal.name}"?`)) return;
    try {
      await api.delete(`/jobs/portals/${portal.id}`);
      toast({ title: "Portal eliminado" });
      load();
      onChanged?.();
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nuevo portal
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : portals.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Aún no hay portales"
          description="Anota dónde tienes cuenta para buscar trabajo (Computrabajo, Indeed…) y qué tan completo está tu perfil."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {portals.map((p) => (
            <li key={p.id} className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base text-text">{p.name}</h3>
                  {p.account ? (
                    <p className="truncate text-xs text-text-3">{p.account}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => {
                      setEditing(p);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${p.name}`}
                    onClick={() => void remove(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={p.status} onValueChange={(v) => void changeStatus(p, v as PortalStatus)}>
                  <SelectTrigger className="h-8 w-auto gap-2 text-xs" aria-label={`Estado de ${p.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PORTAL_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant={PORTAL_STATUS_TONE[p.status]}>{PORTAL_STATUS_LABEL[p.status]}</Badge>
              </div>

              {p.notes ? (
                <p className="whitespace-pre-wrap break-words text-sm text-text-2">{p.notes}</p>
              ) : null}

              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir portal
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <PortalDialog
        open={dialogOpen}
        initial={editing}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          load();
          onChanged?.();
        }}
      />
    </div>
  );
}
