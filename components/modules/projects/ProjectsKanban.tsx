"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLUMNS, STATUS_LABEL, isProjectStatus } from "./constants";
import { ProjectCardBody } from "./ProjectCard";
import type { Project, ProjectStatus } from "./types";

const DRAG_PREFIX = "project-";

function cardId(id: number) {
  return `${DRAG_PREFIX}${id}`;
}

function KanbanCard({ project, dragging }: { project: Project; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-3",
        dragging && "border-accent/60 shadow-none"
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-text-3">
        <GripVertical className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <Link
          href={`/projects/${project.id}`}
          className="truncate text-[11px] text-text-3 transition-colors hover:text-accent"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Abrir detalle
        </Link>
      </div>
      <ProjectCardBody project={project} compact showStatus={false} />
    </div>
  );
}

function DraggableCard({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cardId(project.id),
    data: { projectId: project.id, status: project.status },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-pan-x rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-accent",
        isDragging && "opacity-40"
      )}
    >
      <KanbanCard project={project} />
    </div>
  );
}

function KanbanColumn({
  status,
  projects,
}: {
  status: ProjectStatus;
  projects: Project[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-[264px] shrink-0 flex-col gap-2 xl:w-auto xl:flex-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-2">
          {STATUS_LABEL[status]}
        </h3>
        <Badge variant="neutral">{projects.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[140px] flex-col gap-2 rounded-lg border border-dashed border-border p-2 transition-colors",
          isOver && "border-accent bg-accent-soft"
        )}
      >
        {projects.map((project) => (
          <DraggableCard key={project.id} project={project} />
        ))}
        {projects.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-text-3">
            Sin proyectos
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Kanban de 5 columnas. Al soltar una card en otra columna se dispara
 * `onStatusChange`, que aplica el cambio de forma optimista y revierte si el
 * PATCH falla.
 *
 * Sensores: MouseSensor con distancia mínima y TouchSensor con delay, para que
 * en mobile el scroll horizontal siga funcionando y el drag requiera mantener
 * pulsado.
 */
export function ProjectsKanban({
  projects,
  onStatusChange,
}: {
  projects: Project[];
  onStatusChange: (id: number, status: ProjectStatus) => void;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const byStatus = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>();
    for (const status of STATUS_COLUMNS) map.set(status, []);
    for (const project of projects) {
      const bucket = map.get(project.status);
      if (bucket) bucket.push(project);
    }
    return map;
  }, [projects]);

  const activeProject = activeId ? projects.find((p) => p.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    const id = Number(String(event.active.id).replace(DRAG_PREFIX, ""));
    setActiveId(Number.isInteger(id) ? id : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const target = String(over.id);
    if (!isProjectStatus(target)) return;

    const from = active.data.current?.status as ProjectStatus | undefined;
    if (from === target) return;

    const id = Number(String(active.id).replace(DRAG_PREFIX, ""));
    if (!Number.isInteger(id)) return;

    onStatusChange(id, target);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {STATUS_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            projects={byStatus.get(status) ?? []}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeProject ? (
          <div className="w-[248px] rotate-1">
            <KanbanCard project={activeProject} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
