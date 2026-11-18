"use client";

import * as React from "react";
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
import { ExternalLink, GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  COLUMN_DROP_STATUS,
  KANBAN_COLUMNS,
  KANBAN_COLUMN_COLOR,
  KANBAN_COLUMN_EMPTY,
  KANBAN_COLUMN_LABEL,
  statusColumn,
  type ApplicationStatus,
  type KanbanColumn,
} from "./constants";
import type { JobApplication } from "./types";

/** "2026-11-16" → "16 nov 2026" sin pasar por zonas horarias. */
function formatDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface CardCallbacks {
  onSetStatus: (app: JobApplication, status: ApplicationStatus) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
}

function Card({
  app,
  handleProps,
  overlay = false,
  ghost = false,
  onSetStatus,
  onEdit,
  onDelete,
}: CardCallbacks & {
  app: JobApplication;
  handleProps?: Record<string, unknown>;
  overlay?: boolean;
  ghost?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border border-border bg-surface-2 p-3",
        overlay && "shadow-lg",
        ghost && "opacity-40"
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label="Arrastrar"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-text-3 hover:text-text active:cursor-grabbing"
          {...(handleProps as React.HTMLAttributes<HTMLButtonElement>)}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-medium leading-tight text-text">{app.company}</h4>
          <p className="mt-0.5 break-words text-xs text-text-2">{app.position}</p>
        </div>
        <div className="flex shrink-0 items-center">
          {app.url ? (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir oferta de ${app.company}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface hover:text-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${app.company}`}
            onClick={() => onEdit(app)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar ${app.company}`}
            onClick={() => onDelete(app)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Select value={app.status} onValueChange={(v) => onSetStatus(app, v as ApplicationStatus)}>
          <SelectTrigger className="h-7 w-auto gap-1.5 text-xs" aria-label={`Estado de ${app.company}`}>
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
        <span className="text-[11px] text-text-3">{formatDay(app.appliedAt)}</span>
        {app.source ? <Badge variant="outline">{app.source}</Badge> : null}
        {app.salary ? <span className="text-[11px] text-text-2">{app.salary}</span> : null}
      </div>

      {app.notes ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs text-text-2">
          {app.notes}
        </p>
      ) : null}
    </div>
  );
}

function DraggableCard(props: CardCallbacks & { app: JobApplication }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(props.app.id),
  });
  return (
    <div ref={setNodeRef}>
      <Card {...props} ghost={isDragging} handleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function Column({
  column,
  apps,
  dragging,
  ...callbacks
}: CardCallbacks & { column: KanbanColumn; apps: JobApplication[]; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const color = KANBAN_COLUMN_COLOR[column];

  return (
    <section
      ref={setNodeRef}
      aria-label={KANBAN_COLUMN_LABEL[column]}
      className="flex min-h-[16rem] flex-col rounded-lg border border-border bg-surface p-4 transition-colors"
      style={isOver ? { backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)` } : undefined}
    >
      <header className="mb-3 flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="flex-1 text-lg leading-none tracking-tight text-text">
          {KANBAN_COLUMN_LABEL[column]}
        </h3>
        <span className="font-mono text-xs tabular-nums text-text-3">{apps.length}</span>
      </header>

      <div
        className="flex flex-1 flex-col gap-2 rounded-md border border-dashed p-2 transition-colors"
        style={{
          borderColor: `color-mix(in srgb, ${color} ${isOver ? 85 : dragging ? 45 : 22}%, transparent)`,
        }}
      >
        {apps.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-xs text-text-3">
            {isOver ? "Soltar aquí" : KANBAN_COLUMN_EMPTY[column]}
          </p>
        ) : (
          apps.map((app) => <DraggableCard key={app.id} app={app} {...callbacks} />)
        )}
      </div>
    </section>
  );
}

function isColumn(value: unknown): value is KanbanColumn {
  return typeof value === "string" && (KANBAN_COLUMNS as readonly string[]).includes(value);
}

export function ApplicationsKanban({
  apps,
  onSetStatus,
  onEdit,
  onDelete,
}: CardCallbacks & { apps: JobApplication[] }) {
  const [activeId, setActiveId] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const grouped = React.useMemo(() => {
    const out: Record<KanbanColumn, JobApplication[]> = {
      en_curso: [],
      pasaste: [],
      no_pasaste: [],
    };
    for (const app of apps) out[statusColumn(app.status)].push(app);
    return out;
  }, [apps]);

  const active = activeId === null ? null : (apps.find((a) => a.id === activeId) ?? null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    if (!isColumn(overId)) return;
    const app = apps.find((a) => a.id === Number(event.active.id));
    // Soltar en su misma columna no cambia nada (conserva el estado detallado).
    if (!app || statusColumn(app.status) === overId) return;
    onSetStatus(app, COLUMN_DROP_STATUS[overId]);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {KANBAN_COLUMNS.map((column) => (
          <Column
            key={column}
            column={column}
            apps={grouped[column]}
            dragging={active !== null}
            onSetStatus={onSetStatus}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {active ? (
          <Card
            app={active}
            overlay
            onSetStatus={onSetStatus}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
