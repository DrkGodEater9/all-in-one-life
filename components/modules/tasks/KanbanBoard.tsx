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
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskDTO, type TaskStatus } from "./constants";
import { DraggableTaskCard, TaskCard } from "./TaskCard";

type KanbanProps = {
  tasks: TaskDTO[];
  loading?: boolean;
  onSetStatus: (task: TaskDTO, status: TaskStatus) => void;
  onOpen: (task: TaskDTO) => void;
  onAdvanceStatus: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
};

const DONE_LIMIT = 20;

/** Color de acento por columna (variables CSS del tema). */
const COLUMN_COLOR: Record<TaskStatus, string> = {
  pending: "var(--color-text-3)",
  in_progress: "var(--color-accent)",
  done: "var(--color-green)",
};

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

export function KanbanBoard({
  tasks,
  loading = false,
  onSetStatus,
  onOpen,
  onAdvanceStatus,
  onDelete,
}: KanbanProps) {
  const [activeId, setActiveId] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const grouped = React.useMemo(() => {
    const out: Record<TaskStatus, TaskDTO[]> = { pending: [], in_progress: [], done: [] };
    for (const task of tasks) out[task.status].push(task);
    // Las hechas se acumulan sin fin: solo las más recientes.
    out.done = out.done
      .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))
      .slice(0, DONE_LIMIT);
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
    if (!isStatus(overId)) return;
    const task = tasks.find((t) => t.id === Number(event.active.id));
    if (!task || task.status === overId) return;
    onSetStatus(task, overId);
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
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
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            dragging={activeTask !== null}
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

type ColumnProps = {
  status: TaskStatus;
  tasks: TaskDTO[];
  dragging: boolean;
  onOpen: (task: TaskDTO) => void;
  onAdvanceStatus: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
};

function Column({ status, tasks, dragging, onOpen, onAdvanceStatus, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = COLUMN_COLOR[status];

  return (
    <section
      ref={setNodeRef}
      aria-label={TASK_STATUS_LABELS[status]}
      className="flex min-h-[20rem] flex-col rounded-lg border border-border bg-surface p-4 transition-colors"
      style={
        isOver ? { backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)` } : undefined
      }
    >
      <header className="mb-3 flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="flex-1 text-lg leading-none tracking-tight text-text">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <span className="num text-xs text-text-3">{tasks.length}</span>
      </header>

      <div
        className="flex flex-1 flex-col gap-2 rounded-md border border-dashed p-2 transition-colors"
        style={{
          borderColor: `color-mix(in srgb, ${color} ${isOver ? 85 : dragging ? 45 : 22}%, transparent)`,
        }}
      >
        {tasks.length === 0 ? (
          <p
            className={cn(
              "flex flex-1 items-center justify-center px-3 py-6 text-xs text-text-3"
            )}
          >
            {isOver ? "Soltar aquí" : "Sin tareas"}
          </p>
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

export default KanbanBoard;
