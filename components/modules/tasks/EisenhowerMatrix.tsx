"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QUADRANT_GRID_ORDER,
  QUADRANT_META,
  isQuadrantKey,
  type QuadrantKey,
  type TaskDTO,
} from "./constants";
import { QUADRANT_ICONS } from "./icons";
import { DraggableTaskCard, TaskCard } from "./TaskCard";

type MatrixProps = {
  tasks: TaskDTO[];
  loading?: boolean;
  onMove: (task: TaskDTO, quadrant: QuadrantKey) => void;
  onCreate: (quadrant: QuadrantKey) => void;
  onOpen: (task: TaskDTO) => void;
  onAdvanceStatus: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
};

/**
 * Bordes que dibujan la cruz central. En mobile los cuadrantes se apilan y la
 * cruz se reduce a una línea horizontal entre cada par.
 */
const CROSS_BORDERS: Record<QuadrantKey, string> = {
  do: "border-b border-border lg:border-r",
  schedule: "border-b border-border",
  delegate: "border-b border-border lg:border-b-0 lg:border-r",
  eliminate: "",
};

export function EisenhowerMatrix({
  tasks,
  loading = false,
  onMove,
  onCreate,
  onOpen,
  onAdvanceStatus,
  onDelete,
}: MatrixProps) {
  const [activeId, setActiveId] = React.useState<number | null>(null);

  /**
   * MouseSensor con umbral de 6px para que un clic normal siga abriendo la
   * tarea, y TouchSensor con retardo para que en mobile el gesto de scroll
   * pase de largo: solo una pulsación mantenida inicia el arrastre.
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const grouped = React.useMemo(() => {
    const out: Record<QuadrantKey, TaskDTO[]> = {
      do: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };
    for (const task of tasks) out[task.quadrant].push(task);
    return out;
  }, [tasks]);

  const activeTask = React.useMemo(
    () => (activeId === null ? null : tasks.find((t) => t.id === activeId) ?? null),
    [activeId, tasks]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    if (!isQuadrantKey(overId)) return;

    const task = tasks.find((t) => t.id === Number(event.active.id));
    if (!task || task.quadrant === overId) return;
    onMove(task, overId);
  }

  if (loading) return <MatrixSkeleton />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-hidden rounded-lg border border-border bg-surface lg:grid lg:grid-cols-2">
        {QUADRANT_GRID_ORDER.map((key) => (
          <Quadrant
            key={key}
            quadrant={key}
            tasks={grouped[key]}
            className={CROSS_BORDERS[key]}
            dragging={activeTask !== null}
            onCreate={onCreate}
            onOpen={onOpen}
            onAdvanceStatus={onAdvanceStatus}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCard task={activeTask} overlay className="w-64" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

type QuadrantProps = {
  quadrant: QuadrantKey;
  tasks: TaskDTO[];
  className?: string;
  dragging: boolean;
  onCreate: (quadrant: QuadrantKey) => void;
  onOpen: (task: TaskDTO) => void;
  onAdvanceStatus: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
};

function Quadrant({
  quadrant,
  tasks,
  className,
  dragging,
  onCreate,
  onOpen,
  onAdvanceStatus,
  onDelete,
}: QuadrantProps) {
  const meta = QUADRANT_META[quadrant];
  const Icon = QUADRANT_ICONS[quadrant];
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.title} — ${meta.hint}`}
      className={cn("flex min-h-[15rem] flex-col p-4 transition-colors", className)}
      style={
        isOver
          ? { backgroundColor: `color-mix(in srgb, ${meta.cssVar} 7%, transparent)` }
          : undefined
      }
    >
      <header className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
          style={{
            backgroundColor: `color-mix(in srgb, ${meta.cssVar} 14%, transparent)`,
            color: meta.cssVar,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-none tracking-tight text-text">
            {meta.title}
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-text-3">{meta.hint}</p>
        </div>

        <span className="num shrink-0 text-xs text-text-3">{tasks.length}</span>

        <button
          type="button"
          aria-label={`Nueva tarea en «${meta.title}»`}
          title={`Nueva tarea en «${meta.title}»`}
          onClick={() => onCreate(quadrant)}
          className={cn(
            "shrink-0 rounded-sm border border-border p-1 text-text-2",
            "transition-colors hover:border-accent hover:text-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          )}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </header>

      {/*
        Zona de soltado: el borde de acento del cuadrante vive aquí, punteado y
        a baja opacidad para que sea sutil, y se refuerza mientras se arrastra.
      */}
      <div
        className="flex flex-1 flex-col gap-2 rounded-md border border-dashed p-2 transition-colors"
        style={{
          borderColor: `color-mix(in srgb, ${meta.cssVar} ${
            isOver ? 85 : dragging ? 45 : 22
          }%, transparent)`,
        }}
      >
        {tasks.length === 0 ? (
          <button
            type="button"
            onClick={() => onCreate(quadrant)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-6 text-xs text-text-3",
              "transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            )}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            {isOver ? "Soltar aquí" : "Sin tareas — agregar una"}
          </button>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onOpen={onOpen}
              onAdvanceStatus={onAdvanceStatus}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MatrixSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface lg:grid lg:grid-cols-2">
      {QUADRANT_GRID_ORDER.map((key) => (
        <div key={key} className={cn("space-y-3 p-4", CROSS_BORDERS[key])}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-sm" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
