"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import type { ProjectLink } from "./types";
import { hostnameOf } from "./utils";

const schema = z.object({
  title: z.string().trim().max(120).optional(),
  url: z.string().trim().url("Escribe una URL válida (https://...)").max(2000),
});

type FormValues = z.infer<typeof schema>;

export function ProjectLinks({
  links,
  onAdd,
  onDelete,
}: {
  links: ProjectLink[];
  onAdd: (values: { title: string | null; url: string }) => Promise<void>;
  onDelete: (linkId: number) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", url: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await onAdd({
        title: values.title?.trim() ? values.title.trim() : null,
        url: values.url.trim(),
      });
      reset({ title: "", url: "" });
    } catch {
      // El error ya se notifica con un toast desde el contenedor.
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <SectionHeader
        title="Links"
        description="Referencias, repos, documentos"
        className="mb-3"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Título (opcional)"
            aria-label="Título del link"
            className="sm:w-48"
            {...register("title")}
          />
          <Input
            placeholder="https://..."
            aria-label="URL del link"
            inputMode="url"
            {...register("url")}
          />
          <Button type="submit" size="sm" disabled={isSubmitting} className="sm:h-9">
            {isSubmitting ? "Guardando..." : "Agregar"}
          </Button>
        </div>
        {errors.url ? <p className="text-xs text-danger">{errors.url.message}</p> : null}
      </form>

      {links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Sin links todavía"
          description="Guarda aquí lo que no quieras volver a buscar."
          className="py-8"
        />
      ) : (
        <ul className="mt-4 space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 flex-1"
              >
                <span className="flex items-center gap-1.5 truncate text-sm text-text transition-colors hover:text-accent">
                  {link.title || hostnameOf(link.url)}
                  <ExternalLink className="h-3 w-3 shrink-0 text-text-3" />
                </span>
                <span className="block truncate text-[11px] text-text-3">{link.url}</span>
              </a>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Borrar link"
                onClick={() => void onDelete(link.id)}
                className="shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
