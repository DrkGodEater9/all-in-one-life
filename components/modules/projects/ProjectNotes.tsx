"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectNote } from "./types";
import { formatDateTime } from "./utils";

const schema = z.object({
  content: z.string().trim().min(1, "Escribe algo").max(5000),
});

type FormValues = z.infer<typeof schema>;

/** Notas: entradas cronológicas. Solo se crean y se borran, no se editan. */
export function ProjectNotes({
  notes,
  onAdd,
  onDelete,
}: {
  notes: ProjectNote[];
  onAdd: (content: string) => Promise<void>;
  onDelete: (noteId: number) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { content: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onAdd(values.content.trim());
      reset({ content: "" });
    } catch {
      // El error ya se notifica con un toast desde el contenedor.
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <SectionHeader
        title="Notas"
        description="Entradas cronológicas del proyecto"
        className="mb-3"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Textarea
          rows={2}
          placeholder="Añadir una nota"
          aria-label="Nueva nota"
          {...register("content")}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-danger">{errors.content?.message ?? ""}</p>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Agregar nota"}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Sin notas todavía"
          description="Apunta avances, decisiones o pendientes."
          className="py-8"
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {note.content}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Borrar nota"
                  onClick={() => void onDelete(note.id)}
                  className="shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-text-3">
                {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
