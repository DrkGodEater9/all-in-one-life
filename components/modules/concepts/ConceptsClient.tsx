"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { BookOpen, Pencil, Search, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Concept {
  id: number;
  term: string;
  definition: string;
  topic: string | null;
  createdAt: string;
  updatedAt: string;
}

function errorDescription(e: unknown) {
  return e instanceof ApiClientError ? e.message : "Intenta de nuevo";
}

/** Formulario compartido: alta rápida arriba y edición dentro de cada card. */
function ConceptForm({
  initial,
  topics,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Concept;
  topics: string[];
  submitLabel: string;
  onSubmit: (values: { term: string; definition: string; topic: string | null }) => Promise<void>;
  onCancel?: () => void;
}) {
  const listId = useId();
  const [term, setTerm] = useState(initial?.term ?? "");
  const [definition, setDefinition] = useState(initial?.definition ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [saving, setSaving] = useState(false);

  const canSubmit = term.trim() !== "" && definition.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({
        term: term.trim(),
        definition: definition.trim(),
        topic: topic.trim() || null,
      });
      if (!initial) {
        setTerm("");
        setDefinition("");
        setTopic("");
      }
    } catch {
      // El contenedor ya mostró el toast.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={term}
          maxLength={200}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Concepto o tema"
          aria-label="Concepto"
        />
        <Input
          value={topic}
          maxLength={80}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Área (opcional)"
          aria-label="Área o categoría"
          list={listId}
          className="sm:w-56"
        />
        <datalist id={listId}>
          {topics.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <Textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        rows={initial ? 5 : 3}
        placeholder="Descripción o explicación"
        aria-label="Descripción"
      />
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={saving || !canSubmit}>
          {saving ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ConceptsClient() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Concept[]>("/concepts")
      .then((data) => {
        if (!cancelled) setConcepts(data);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            e instanceof ApiClientError ? e.message : "No se pudieron cargar los conceptos"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const topics = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of concepts) if (c.topic) map.set(c.topic.toLowerCase(), c.topic);
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [concepts]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return concepts.filter((c) => {
      if (topic && c.topic?.toLowerCase() !== topic.toLowerCase()) return false;
      if (!term) return true;
      return `${c.term} ${c.definition} ${c.topic ?? ""}`.toLowerCase().includes(term);
    });
  }, [concepts, search, topic]);

  const byTerm = (a: Concept, b: Concept) => a.term.localeCompare(b.term, "es");

  async function handleCreate(values: { term: string; definition: string; topic: string | null }) {
    try {
      const created = await api.post<Concept>("/concepts", values);
      setConcepts((prev) => [...prev, created].sort(byTerm));
      toast({ title: "Concepto guardado", description: created.term });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar el concepto",
        description: errorDescription(e),
      });
      throw e;
    }
  }

  async function handleUpdate(
    id: number,
    values: { term: string; definition: string; topic: string | null }
  ) {
    try {
      const updated = await api.patch<Concept>(`/concepts/${id}`, values);
      setConcepts((prev) => prev.map((c) => (c.id === id ? updated : c)).sort(byTerm));
      setEditingId(null);
      toast({ title: "Concepto actualizado" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description: errorDescription(e),
      });
      throw e;
    }
  }

  async function handleDelete(concept: Concept) {
    if (!window.confirm(`¿Borrar "${concept.term}"?`)) return;
    const snapshot = concepts;
    setConcepts((prev) => prev.filter((c) => c.id !== concept.id));
    try {
      await api.delete(`/concepts/${concept.id}`);
      toast({ title: "Concepto borrado" });
    } catch (e) {
      setConcepts(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudo borrar",
        description: errorDescription(e),
      });
    }
  }

  const hasFilters = topic !== null || search.trim() !== "";

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-4">
        <ConceptForm topics={topics} submitLabel="Agregar concepto" onSubmit={handleCreate} />
      </section>

      <div className="space-y-3">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar concepto"
            className="pl-9"
            aria-label="Buscar concepto"
          />
        </div>

        {topics.length > 0 ? (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {topics.map((t) => {
              const active = topic?.toLowerCase() === t.toLowerCase();
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(active ? null : t)}
                  className={cn(
                    "shrink-0 rounded-sm border px-2.5 py-1 text-[11px] transition-colors",
                    active
                      ? "border-accent/50 bg-accent-soft text-accent"
                      : "border-border text-text-2 hover:text-text"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <EmptyState icon={BookOpen} title="No se pudieron cargar los conceptos" description={loadError} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={hasFilters ? "Ningún concepto coincide" : "Sin conceptos todavía"}
          description={
            hasFilters
              ? "Prueba con otra búsqueda o quita el filtro."
              : "Agrega tu primer concepto con el formulario de arriba."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <li key={c.id} className="min-w-0 rounded-lg border border-border bg-surface p-4">
              {editingId === c.id ? (
                <ConceptForm
                  initial={c}
                  topics={topics}
                  submitLabel="Guardar"
                  onSubmit={(values) => handleUpdate(c.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="break-words text-lg leading-tight text-text">{c.term}</h3>
                      {c.topic ? <Badge variant="outline">{c.topic}</Badge> : null}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Editar ${c.term}`}
                        onClick={() => setEditingId(c.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Borrar ${c.term}`}
                        onClick={() => void handleDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-2">
                    {c.definition}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
