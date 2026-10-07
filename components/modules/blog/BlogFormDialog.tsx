"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { TagPicker } from "@/components/modules/projects/TagPicker";
import type { BlogPost } from "./types";

export function BlogFormDialog({
  open,
  onOpenChange,
  tagSuggestions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagSuggestions: string[];
  onCreated: (post: BlogPost) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setContent("");
      setTags([]);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const post = await api.post<BlogPost>("/blog", { title, content, tags });
      onCreated(post);
      onOpenChange(false);
      toast({ title: "Entrada creada", description: post.title });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la entrada",
        description: err instanceof ApiClientError ? err.message : "Intenta de nuevo",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva entrada</DialogTitle>
          <DialogDescription>
            Notas, actas, ideas. Los documentos se agregan como links en la entrada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="blog-title">Título</Label>
              <Input
                id="blog-title"
                autoFocus
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Reunión del grupo — avances de octubre"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-content">Contenido</Label>
              <Textarea
                id="blog-content"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={50000}
                placeholder="Escribe aquí…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Etiquetas</Label>
              <TagPicker
                value={tags}
                onChange={setTags}
                suggestions={tagSuggestions.map((name, i) => ({
                  id: i,
                  name,
                  createdAt: "",
                }))}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Guardando..." : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
