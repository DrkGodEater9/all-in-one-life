"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn, toDateKey } from "@/lib/utils";

import { CATEGORY_META, FREQUENCY_LABEL } from "./constants";
import { dateKeyOf, toEditable, type CalendarEventDTO, type EditableEvent } from "./types";

/** "YYYY-MM-DD" → Date local (sin desplazar el día por la zona horaria). */
function localDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface EventPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (event: EditableEvent) => void;
}

/**
 * Una fila por evento; las series recurrentes se agrupan en una sola fila
 * (la próxima ocurrencia, o la última si ya pasaron todas).
 */
function groupEvents(events: CalendarEventDTO[], todayKey: string): CalendarEventDTO[] {
  const out: CalendarEventDTO[] = [];
  const series = new Map<number, CalendarEventDTO>();
  for (const event of events) {
    if (event.recurrenceId == null) {
      out.push(event);
      continue;
    }
    const current = series.get(event.recurrenceId);
    const key = dateKeyOf(event.date);
    if (!current) {
      series.set(event.recurrenceId, event);
      continue;
    }
    const currentKey = dateKeyOf(current.date);
    const better =
      currentKey < todayKey
        ? key > currentKey // la actual ya pasó: preferir una posterior
        : key >= todayKey && key < currentKey; // preferir la próxima más cercana
    if (better) series.set(event.recurrenceId, event);
  }
  return [...out, ...series.values()].sort((a, b) =>
    dateKeyOf(a.date).localeCompare(dateKeyOf(b.date))
  );
}

export function EventPickerDialog({ open, onOpenChange, onPick }: EventPickerDialogProps) {
  const [events, setEvents] = React.useState<CalendarEventDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQuery("");
    setLoading(true);
    api
      .get<CalendarEventDTO[]>("/calendar/events")
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
  }, [open]);

  const rows = React.useMemo(() => {
    const grouped = groupEvents(events, toDateKey(new Date()));
    const q = query.trim().toLowerCase();
    return q ? grouped.filter((e) => e.title.toLowerCase().includes(q)) : grouped;
  }, [events, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription>Elige el evento que quieres modificar.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Input
            placeholder="Buscar por título"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar evento"
          />
          <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
            {loading ? (
              <p className="py-6 text-center text-sm text-text-3">Cargando…</p>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-3">No hay eventos.</p>
            ) : (
              rows.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onPick(toEditable(event))}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      CATEGORY_META[event.category].dot
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{event.title}</span>
                    <span className="block text-xs text-text-3">
                      {format(localDate(dateKeyOf(event.date)), "d MMM yyyy", { locale: es })}
                      {event.recurrence
                        ? ` · ${FREQUENCY_LABEL[event.recurrence.frequency]}${
                            event.recurrence.intervalN > 1 ? ` (cada ${event.recurrence.intervalN})` : ""
                          }`
                        : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default EventPickerDialog;
