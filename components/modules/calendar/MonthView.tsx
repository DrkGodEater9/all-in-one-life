"use client";

import * as React from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

import { cn, toDateKey } from "@/lib/utils";
import { CATEGORY_META } from "./constants";
import { labelColorVar, QUADRANT_META, quadrantOf } from "@/components/modules/tasks/constants";
import { dateKeyOf, type CalendarEventDTO, type TaskDayDTO } from "./types";

const WEEK_OPTS = { weekStartsOn: 1 as const, locale: es };
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** Columnas de ancho fijo: las celdas no cambian de tamaño con el contenido. */
const GRID_COLS = "grid-cols-[repeat(7,7.5rem)]";
const MAX_ITEMS = 4;

interface DayItem {
  id: string;
  title: string;
  /** Clase de color (eventos). */
  dotClass?: string;
  /** Color CSS (tareas). */
  color?: string;
}

interface MonthViewProps {
  cursor: Date;
  events: CalendarEventDTO[];
  tasks?: TaskDayDTO[];
  onSelectDay: (date: Date) => void;
}

/**
 * Grid del mes. A 375px las celdas siguen siendo usables porque no muestran
 * texto de los eventos, solo un punto por categoría presente.
 */
/** Color del punto de una tarea: el de su etiqueta; sin etiqueta, el de su cuadrante. */
function taskColor(task: TaskDayDTO): string {
  if (task.labelColor) return labelColorVar(task.labelColor);
  const meta = QUADRANT_META[quadrantOf(task.urgent, task.important)];
  // `eliminate` usa el color de borde, casi invisible como punto.
  return meta.key === "eliminate" ? "var(--color-text-3)" : meta.cssVar;
}

/** Color del punto de una tarea (compartido con la vista de semana). */
export { taskColor };

export function MonthView({ cursor, events, tasks = [], onSelectDay }: MonthViewProps) {
  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
        end: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
      }),
    [cursor]
  );

  /** dateKey → eventos y luego tareas pendientes de ese día, como chips. */
  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (key: string, item: DayItem) => {
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    };
    for (const event of events) {
      push(dateKeyOf(event.date), {
        id: `e-${event.id}`,
        title: event.title,
        dotClass: CATEGORY_META[event.category].dot,
      });
    }
    for (const task of tasks) {
      if (task.status === "done") continue; // solo lo pendiente
      push(dateKeyOf(task.date), { id: `t-${task.id}`, title: task.title, color: taskColor(task) });
    }
    return map;
  }, [events, tasks]);

  /** dateKey → cuántos eventos/tareas, para el aria-label. */
  const byDay = React.useMemo(() => {
    const map = new Map<string, { count: number }>();
    for (const [key, list] of itemsByDay) map.set(key, { count: list.length });
    return map;
  }, [itemsByDay]);

  return (
    <div className="w-fit max-w-full overflow-x-auto rounded-lg border border-border bg-surface">
     <div className="w-max">
      <div className={cn("grid border-b border-border", GRID_COLS)}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-text-3"
          >
            {d}
          </div>
        ))}
      </div>

      <div className={cn("grid", GRID_COLS)}>
        {days.map((day) => {
          const key = toDateKey(day);
          const entry = byDay.get(key);
          const outside = !isSameMonth(day, cursor);
          const today = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={`${format(day, "d 'de' LLLL", { locale: es })}${
                entry ? `, ${entry.count} evento(s) o tarea(s)` : ""
              }`}
              className={cn(
                "flex h-[8.5rem] flex-col items-start gap-1 overflow-hidden border-b border-r border-border p-1.5 transition-colors",
                "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40",
                outside && "text-text-3"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-sm text-xs tabular-nums",
                  today ? "bg-accent font-medium text-white" : outside ? "text-text-3" : "text-text"
                )}
              >
                {format(day, "d")}
              </span>

              <span className="flex w-full min-w-0 flex-col gap-0.5">
                {(itemsByDay.get(key) ?? []).slice(0, MAX_ITEMS).map((item) => (
                  <span
                    key={item.id}
                    title={item.title}
                    className="flex h-[18px] w-full items-center gap-1 overflow-hidden rounded-sm bg-surface-2 pr-1 text-left text-[11px] leading-none text-text-2"
                  >
                    <span
                      className={cn("h-full w-[3px] shrink-0", item.dotClass)}
                      style={item.color ? { backgroundColor: item.color } : undefined}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
     </div>
    </div>
  );
}

export default MonthView;
