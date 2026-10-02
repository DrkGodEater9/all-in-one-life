"use client";

import * as React from "react";
import { eachDayOfInterval, endOfWeek, format, isToday, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

import { cn, formatTime, toDateKey } from "@/lib/utils";
import { categoryMeta } from "./constants";
import { taskColor } from "./MonthView";
import { dateKeyOf, type CalendarEventDTO, type TaskDayDTO } from "./types";

const WEEK_OPTS = { weekStartsOn: 1 as const, locale: es };

interface WeekViewProps {
  cursor: Date;
  events: CalendarEventDTO[];
  tasks?: TaskDayDTO[];
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: CalendarEventDTO) => void;
}

/**
 * 7 columnas en desktop. En mobile se apila como lista de días, que es más
 * legible a 375px que un scroll horizontal de columnas estrechas.
 */
export function WeekView({ cursor, events, tasks = [], onSelectDay, onSelectEvent }: WeekViewProps) {
  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(cursor, WEEK_OPTS),
        end: endOfWeek(cursor, WEEK_OPTS),
      }),
    [cursor]
  );

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const event of events) {
      const key = dateKeyOf(event.date);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, TaskDayDTO[]>();
    for (const task of tasks) {
      const key = dateKeyOf(task.date);
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-7">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = byDay.get(key) ?? [];
        const dayTasks = tasksByDay.get(key) ?? [];
        const today = isToday(day);

        return (
          <div key={key} className="flex min-h-[7rem] flex-col bg-surface">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex items-baseline gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 sm:flex-col sm:gap-0.5"
            >
              <span className="text-[11px] uppercase tracking-wide text-text-3">
                {format(day, "EEE", { locale: es })}
              </span>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  today ? "font-medium text-accent" : "text-text"
                )}
              >
                {format(day, "d MMM", { locale: es })}
              </span>
            </button>

            <div className="flex flex-1 flex-col gap-1 p-2">
              {dayEvents.length === 0 && dayTasks.length === 0 ? (
                <p className="px-1 py-2 text-xs text-text-3">Sin eventos ni tareas</p>
              ) : (
                dayEvents.map((event) => {
                  const meta = categoryMeta(event.category);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="flex items-start gap-2 rounded-sm border border-border bg-surface-2 px-2 py-1.5 text-left transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                    >
                      <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                      <span className="min-w-0">
                        <span className="block font-mono text-[11px] text-text-2">
                          {formatTime(event.time)}
                        </span>
                        <span className="block truncate text-xs text-text">{event.title}</span>
                      </span>
                    </button>
                  );
                })
              )}
              {dayTasks.map((task) => (
                <button
                  key={`task-${task.id}`}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="flex items-start gap-2 rounded-sm border border-dashed border-border bg-surface px-2 py-1.5 text-left transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: taskColor(task) }}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] text-text-2">
                      {task.time ?? "Tarea"}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-xs text-text",
                        task.status === "done" && "text-text-3 line-through"
                      )}
                    >
                      {task.title}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WeekView;
