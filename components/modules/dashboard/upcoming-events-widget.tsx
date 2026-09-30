"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { api, ApiClientError, qs } from "@/lib/api";
import { cn, toDateKey } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui";
import { categoryMeta } from "@/components/modules/calendar/constants";
import { dateKeyOf, timeOf, type CalendarEventDTO } from "@/components/modules/calendar/types";
import { WidgetError, WidgetShell, WidgetSkeleton } from "./widget-shell";

const MAX_EVENTS = 3;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CalendarEventDTO[] };

/** "HH:mm" de la hora local actual del navegador. */
function nowTimeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Widget 3: los 3 próximos eventos, con hora y categoría (badge de color). */
export function UpcomingEventsWidget() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const todayKey = toDateKey(now);
    const nowTime = nowTimeKey(now);

    api
      .get<CalendarEventDTO[]>(`/calendar/events${qs({ from: todayKey })}`)
      .then((events) => {
        if (cancelled) return;
        // El filtro `from` ya descarta días anteriores; falta descartar los
        // eventos de hoy cuya hora ya pasó (la API los sigue devolviendo).
        const upcoming = events
          .filter((event) => {
            const eventDate = dateKeyOf(event.date);
            if (eventDate > todayKey) return true;
            return eventDate === todayKey && timeOf(event.time) >= nowTime;
          })
          .slice(0, MAX_EVENTS);
        setState({ status: "ready", data: upcoming });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiClientError ? error.message : "No se pudieron cargar los eventos",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell href="/calendar" title="Próximos eventos" icon={Calendar}>
      {state.status === "loading" && <WidgetSkeleton />}
      {state.status === "error" && <WidgetError message={state.message} />}
      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <EmptyState title="Sin eventos próximos" className="py-4" />
        ) : (
          <ul className="space-y-2.5">
            {state.data.map((event) => {
              const meta = categoryMeta(event.category);
              return (
                <li key={event.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-mono text-xs text-text-2">
                      {timeOf(event.time)}
                    </span>
                    <span className="truncate text-sm text-text">{event.title}</span>
                  </div>
                  <Badge variant="outline" className={cn(meta.text, meta.border, meta.bg, "shrink-0")}>
                    <span aria-hidden>{meta.icon}</span> {meta.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ))}
    </WidgetShell>
  );
}
