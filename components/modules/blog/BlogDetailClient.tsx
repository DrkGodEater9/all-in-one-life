"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, NotebookPen, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ProjectLinks } from "@/components/modules/projects/ProjectLinks";
import { TagPicker } from "@/components/modules/projects/TagPicker";
import { formatDateTime } from "@/components/modules/projects/utils";
import type { BlogLink, BlogPost } from "./types";

function errorDescription(e: unknown) {
  return e instanceof ApiClientError ? e.message : "Intenta de nuevo";
}

export function BlogDetailClient({ postId }: { postId: number }) {
  const router = useRouter();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<BlogPost>(`/blog/${postId}`)
      .then((data) => {
        if (!cancelled) setPost(data);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            e instanceof ApiClientError ? e.message : "No se pudo cargar la entrada"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  function startEditing() {
    if (!post) return;
    setDraftTitle(post.title);
    setDraftContent(post.content);
    setDraftTags(post.tags);
    setEditing(true);
  }

  async function handleSave() {
    if (!draftTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await api.patch<BlogPost>(`/blog/${postId}`, {
        title: draftTitle,
        content: draftContent,
        tags: draftTags,
      });
      setPost(updated);
      setEditing(false);
      toast({ title: "Entrada guardada" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: errorDescription(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePin() {
    if (!post) return;
    const snapshot = post;
    setPost({ ...post, pinned: !post.pinned });
    try {
      const updated = await api.patch<BlogPost>(`/blog/${postId}`, { pinned: !post.pinned });
      setPost(updated);
    } catch (e) {
      setPost(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudo fijar la entrada",
        description: errorDescription(e),
      });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/blog/${postId}`);
      toast({ title: "Entrada borrada" });
      router.push("/blog");
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo borrar la entrada",
        description: errorDescription(e),
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddLink(values: { title: string | null; url: string }) {
    const link = await api.post<BlogLink>(`/blog/${postId}/links`, values).catch((e: unknown) => {
      toast({
        variant: "destructive",
        title: "No se pudo guardar el link",
        description: errorDescription(e),
      });
      throw e;
    });
    setPost((current) => (current ? { ...current, links: [...current.links, link] } : current));
    toast({ title: "Link agregado" });
  }

  async function handleDeleteLink(linkId: number) {
    if (!post) return;
    const snapshot = post;
    setPost({ ...post, links: post.links.filter((l) => l.id !== linkId) });
    try {
      await api.delete(`/blog/${postId}/links/${linkId}`);
      toast({ title: "Link borrado" });
    } catch (e) {
      setPost(snapshot);
      toast({
        variant: "destructive",
        title: "No se pudo borrar el link",
        description: errorDescription(e),
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="Entrada no disponible"
        description={loadError ?? "No encontramos esta entrada."}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/blog">Volver al blog</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Blog
      </Link>

      {editing ? (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={draftTitle}
              maxLength={200}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-content">Contenido</Label>
            <Textarea
              id="edit-content"
              rows={16}
              value={draftContent}
              maxLength={50000}
              onChange={(e) => setDraftContent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            <TagPicker value={draftTags} onChange={setDraftTags} maxTags={10} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !draftTitle.trim()}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <header className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-3xl leading-tight tracking-tight text-text">
                  {post.title}
                </h1>
                <p className="mt-1 text-[11px] text-text-3">
                  Actualizado {formatDateTime(post.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={post.pinned ? "Quitar de fijadas" : "Fijar entrada"}
                  onClick={() => void handleTogglePin()}
                >
                  {post.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={startEditing}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Borrar entrada"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            ) : null}
          </header>

          <section className="rounded-lg border border-border bg-surface p-4">
            {post.content ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text">
                {post.content}
              </p>
            ) : (
              <p className="text-sm text-text-3">Esta entrada no tiene contenido todavía.</p>
            )}
          </section>
        </>
      )}

      <ProjectLinks
        links={post.links}
        onAdd={handleAddLink}
        onDelete={handleDeleteLink}
        title="Documentos"
        description="Links a PDFs, Drive, Notion, papers…"
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Borrar entrada</DialogTitle>
            <DialogDescription>Se borrarán también sus documentos.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="break-words text-sm text-text-2">{post.title}</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Borrando..." : "Borrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
