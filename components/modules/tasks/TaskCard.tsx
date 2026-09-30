"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Clock, GripVertical, Repeat, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABELS,
  labelColorVar,
  type TaskDTO,
  type TaskStatus,
} from "./constants";
import { STATUS_ICONS } from "./icons";
import { formatDateKeyRelative, isOverdue } from "./format";

/** Siguiente estado del ciclo del botón de la card. */
export function nextStatus(status: TaskStatus): TaskStatus {
  if (status === "pending") return "in_progress";
  if (status === "in_progress") return "done";
  return "pending";
}

export type TaskCardProps = {
  task: TaskDTO;
  onOpen?: (task: TaskDTO) => void;
  onAdvanceStatus?: (task: TaskDTO) => void;
  onDelete?: (task: TaskDTO) => void;
  /** Muestra el asa de arrastre. */
  showGrip?: boolean;
  /** Hueco que queda mientras la card viaja en el DragOverlay. */
  ghost?: boolean;
  /** Copia flotante que sigue al cursor. */
  overlay?: boolean;
  className?: string;
};

/**
 * Card de tarea. Presentacional: no sabe de dnd-kit — el wrapper draggable le
 * pasa los listeners por `dragHandleProps`.
 */
export const TaskCard = React.forwardRef<
  HTMLDivElement,
  TaskCardProps & {
    /** `attributes` + `listeners` de `useDraggable`, ya combinados. */
    dragHandleProps?: Record<string, unknown>;
    style?: React.CSSProperties;
  }
>(function TaskCard(
  {
    task,
    onOpen,
    onAdvanceStatus,
    onDelete,
    showGrip = false,
    ghost = false,
    overlay = false,
    className,
    dragHandleProps,
    style,
  },
  ref
) {
  const StatusIcon = STATUS_ICONS[task.status];
  const overdue = task.status !== "done" && isOverdue(task.date);

  // dnd-kit no devuelve ningún `onClick`, así que basta con esparcir sus
  // listeners y poner el nuestro aparte.
  const handleProps = (dragHandleProps ??
    {}) as unknown as React.HTMLAttributes<HTMLDivElement>;

  return (
    <div
      ref={ref}
      style={style}
      {...handleProps}
      onClick={(event) => {
        if (event.defaultPrevented) return;
        onOpen?.(task);
      }}
      className={cn(
        "group relative rounded-md border border-border bg-surface-2 px-3 py-2.5 text-left",
        "transition-colors hover:border-[color-mix(in_srgb,var(--color-accent)_45%,var(--color-border))]",
        onOpen && "cursor-pointer",
        ghost && "opacity-30",
        overlay && "cursor-grabbing border-accent shadow-none",
        task.status === "done" && "opacity-60",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {onAdvanceStatus ? (
          <button
            type="button"
            aria-label={`Estado: ${TASK_STATUS_LABELS[task.status]}. Cambiar`}
            title={`${TASK_STATUS_LABELS[task.status]} — clic para avanzar`}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onAdvanceStatus(task);
            }}
            className={cn(
              "mt-0.5 shrink-0 rounded-sm text-text-3 transition-colors hover:text-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              task.status === "in_progress" && "text-accent",
              task.status === "done" && "text-success"
            )}
          >
            <StatusIcon className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : (
          <StatusIcon
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-text-3",
              task.status === "in_progress" && "text-accent",
              task.status === "done" && "text-success"
            )}
            strokeWidth={1.75}
          />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "break-words text-sm leading-snug text-text",
              task.status === "done" && "line-through decoration-text-3"
            )}
          >
            {task.title}
          </p>

          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-text-3">
              {task.description}
            </p>
          ) : null}

          {(task.date || task.labels.length > 0 || task.recurrence) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              {task.date ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] leading-4",
                    overdue ? "text-red" : "text-text-2"
                  )}
                >
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  {formatDateKeyRelative(task.date)}
                  {task.time ? <span className="num">{task.time}</span> : null}
                </span>
              ) : null}

              {task.recurrence ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] leading-4 text-text-2"
                  title="Tarea recurrente"
                >
                  <Repeat className="h-3 w-3" strokeWidth={1.75} />
                </span>
              ) : null}

              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-sm border border-border px-1.5 py-px text-[11px] leading-4 text-text-2"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: labelColorVar(label.color) }}
                  />
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {onDelete ? (
            <button
              type="button"
              aria-label={`Eliminar «${task.title}»`}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                onDelete(task);
              }}
              className={cn(
                "rounded-sm p-1 text-text-3 opacity-0 transition-colors hover:text-red",
                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                "group-hover:opacity-100"
              )}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          ) : null}

          {showGrip ? (
            <GripVertical
              aria-hidden
              className="h-4 w-4 text-text-3 opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={1.75}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
});

/**
 * Card arrastrable de la matriz. El `id` del draggable es el id de la tarea en
 * texto; su `data` lleva el cuadrante actual para poder ignorar los drops que
 * no cambian nada.
 */
export function DraggableTaskCard(props: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(props.task.id),
    data: { quadrant: props.task.quadrant },
  });

  return (
    <TaskCard
      {...props}
      ref={setNodeRef}
      ghost={isDragging}
      showGrip
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}
