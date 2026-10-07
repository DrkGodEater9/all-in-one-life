"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Link2, NotebookPen, Pin, Plus, Search } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/components/modules/projects/utils";
import { BlogFormDialog } from "./BlogFormDialog";
import type { BlogPost } from "./types";

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.id}`}
      className="block min-w-0 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-lg leading-tight text-text">{post.title}</h3>
        {post.pinned ? <Pin className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" /> : null}
      </div>

      {post.content ? (
        <p className="mt-2 line-clamp-3 break-words text-xs leading-relaxed text-text-2">
          {post.content}
        </p>
      ) : null}

      {post.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3 text-[11px] text-text-3">
        <span>{formatDate(post.updatedAt)}</span>
        {post.links.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            {post.links.length}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function BlogClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<BlogPost[]>("/blog")
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            e instanceof ApiClientError ? e.message : "No se pudo cargar el blog"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of posts) for (const t of p.tags) set.set(t.toLowerCase(), t);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (tag && !p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
      if (!term) return true;
      return `${p.title} ${p.content} ${p.tags.join(" ")}`.toLowerCase().includes(term);
    });
  }, [posts, search, tag]);

  const hasFilters = tag !== null || search.trim() !== "";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el blog"
            className="pl-9"
            aria-label="Buscar en el blog"
          />
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="self-end sm:self-auto">
          <Plus className="h-4 w-4" />
          Nueva entrada
        </Button>
      </div>

      {allTags.length > 0 ? (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {allTags.map((t) => {
            const active = tag?.toLowerCase() === t.toLowerCase();
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTag(active ? null : t)}
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

      {loading ? (
        <ListSkeleton />
      ) : loadError ? (
        <EmptyState
          icon={NotebookPen}
          title="No se pudo cargar el blog"
          description={loadError}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={hasFilters ? "Ninguna entrada coincide" : "Sin entradas todavía"}
          description={
            hasFilters
              ? "Prueba con otra búsqueda o quita el filtro de etiqueta."
              : "Guarda aquí las notas del grupo de investigación y lo que no quieras perder."
          }
          action={
            hasFilters ? null : (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Nueva entrada
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <BlogFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tagSuggestions={allTags}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
      />
    </div>
  );
}
