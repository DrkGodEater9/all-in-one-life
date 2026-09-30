"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "@/components/ui/use-toast";
import { api, qs } from "@/lib/api";
import { toDateKey } from "@/lib/utils";

import { DayView } from "./DayView";
import { EventFormDialog } from "./EventFormDialog";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import type { CalendarEventDTO } from "./types";

type View = "month" | "week" | "day";

const WEEK_OPTS = { weekStartsOn: 1 as const, locale: es };

/** Rango [from, to] que hay que pedir a la API para la vista actual. */
function rangeFor(view: View, cursor: Date): { from: Date; to: Date } {
  if (view === "week") {
    return { from: startOfWeek(cursor, WEEK_OPTS), to: endOfWeek(cursor, WEEK_OPTS) };
  }
  if (view === "day") return { from: cursor, to: cursor };
  return {
    from: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
    to: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
  };
}

export function CalendarClient() {
  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [events, setEvents] = React.useState<CalendarEventDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventDTO | null>(null);

  const range = React.useMemo(() => rangeFor(view, cursor), [view, cursor]);
  const fromKey = toDateKey(range.from);
  const toKey = toDateKey(range.to);
  const cursorKey = toDateKey(cursor);

  // La vista Día tiene su propio endpoint (eventos + tareas), no necesita esto.
  const needsEvents = view !== "day";

  React.useEffect(() => {
    if (!needsEvents) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<CalendarEventDTO[]>(`/calendar/events${qs({ from: fromKey, to: toKey })}`)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudieron cargar los eventos",
          description: error instanceof Error ? error.message : undefined,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsEvents, fromKey, toKey, refreshKey]);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  const goPrev = () =>
    setCursor((c) => (view === "month" ? addMonths(c, -1) : view === "week" ? addWeeks(c, -1) : addDays(c, -1)));
  const goNext = () =>
    setCursor((c) => (view === "month" ? addMonths(c, 1) : view === "week" ? addWeeks(c, 1) : addDays(c, 1)));

  const openDay = (date: Date) => {
    setCursor(date);
    setView("day");
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (event: CalendarEventDTO) => {
    setEditing(event);
    setDialogOpen(true);
  };

  const label =
    view === "month"
      ? format(cursor, "LLLL yyyy", { locale: es })
      : view === "week"
        ? `${format(range.from, "d MMM", { locale: es })} – ${format(range.to, "d MMM yyyy", { locale: es })}`
        : format(cursor, "EEEE d 'de' LLLL yyyy", { locale: es });

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Eventos, recordatorios y tareas con fecha."
        action={
          <Button onClick={openCreate} aria-label="Crear evento">
            <CalendarPlus className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Nuevo evento</span>
            <span className="ml-2 sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="month">Mes</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="day">Día</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goPrev} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm capitalize text-text-2">{label}</span>
          <Button variant="outline" size="icon-sm" onClick={goNext} aria-label="Siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      {needsEvents && loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : view === "month" ? (
        <MonthView cursor={cursor} events={events} onSelectDay={openDay} />
      ) : view === "week" ? (
        <WeekView
          cursor={cursor}
          events={events}
          onSelectDay={openDay}
          onSelectEvent={openEdit}
        />
      ) : (
        <DayView
          dateKey={cursorKey}
          refreshKey={refreshKey}
          onChanged={refresh}
          onEditEvent={openEdit}
          onCreate={openCreate}
        />
      )}

      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={cursorKey}
        onSaved={refresh}
      />
    </>
  );
}

export default CalendarClient;
