import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ViabilityDot } from "./ViabilityDot";
import type { Project } from "./types";
import { formatDate } from "./utils";

/** Contenido visual de una card de proyecto, reutilizado por lista y kanban. */
export function ProjectCardBody({
  project,
  compact = false,
  showStatus = true,
}: {
  project: Project;
  compact?: boolean;
  showStatus?: boolean;
}) {
  const tags = project.tags.map((t) => t.tag);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "min-w-0 leading-tight text-text",
            compact ? "text-base" : "text-lg"
          )}
        >
          {project.title}
        </h3>
        <ViabilityDot viability={project.viability} className="mt-1.5" />
      </div>

      {project.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-text-2">
          {project.description}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {showStatus ? <StatusBadge status={project.status} /> : null}
        {project.category ? (
          <Badge variant="outline">{project.category.name}</Badge>
        ) : null}
        {tags.map((tag) => (
          <Badge key={tag.id}>{tag.name}</Badge>
        ))}
      </div>

      <p className="text-[11px] text-text-3">{formatDate(project.createdAt)}</p>
    </div>
  );
}

/** Card de la pestaña Lista: enlaza al detalle. */
export function ProjectListCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:border-accent"
    >
      <ProjectCardBody project={project} />
    </Link>
  );
}
