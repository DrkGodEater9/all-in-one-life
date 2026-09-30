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
import { CATEGORY_META, type EventCategory } from "./constants";
import { dateKeyOf, type CalendarEventDTO } from "./types";

const WEEK_OPTS = { weekStartsOn: 1 as const, locale: es };
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

interface MonthViewProps {
  cursor: Date;
  events: CalendarEventDTO[];
  onSelectDay: (date: Date) => void;
}

/**
 * Grid del mes. A 375px las celdas siguen siendo usables porque no muestran
 * texto de los eventos, solo un punto por categoría presente.
 */
export function MonthView({ cursor, events, onSelectDay }: MonthViewProps) {
  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
        end: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
      }),
    [cursor]
  );

  /** dateKey → categorías distintas con evento ese día (en orden fijo). */
  const byDay = React.useMemo(() => {
    const map = new Map<string, { categories: EventCategory[]; count: number }>();
    for (const event of events) {
      const key = dateKeyOf(event.date);
      const entry = map.get(key) ?? { categories: [], count: 0 };
      if (!entry.categories.includes(event.category)) entry.categories.push(event.category);
      entry.count += 1;
      map.set(key, entry);
    }
    return map;
  }, [events]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-text-3"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
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
                entry ? `, ${entry.count} evento(s)` : ""
              }`}
              className={cn(
                "flex min-h-[3.75rem] flex-col items-center gap-1 border-b border-r border-border p-1.5 transition-colors sm:min-h-[5.5rem] sm:items-start sm:p-2",
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

              {entry ? (
                <span className="flex flex-wrap items-center justify-center gap-1 sm:justify-start">
                  {entry.categories.map((category) => (
                    <span
                      key={category}
                      title={CATEGORY_META[category].label}
                      className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_META[category].dot)}
                    />
                  ))}
                  {entry.count > entry.categories.length ? (
                    <span className="hidden text-[10px] text-text-3 sm:inline">
                      +{entry.count - entry.categories.length}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
