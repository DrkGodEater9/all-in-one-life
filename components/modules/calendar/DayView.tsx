"use client";

import * as React from "react";
import {
  Bell,
  CalendarDays,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { api, qs } from "@/lib/api";
import { cn } from "@/lib/utils";

import { REMIND_TYPE_LABEL, categoryMeta } from "./constants";
import { toEditable, type DayItem, type DayResponse, type EditableEvent } from "./types";

const TASK_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Hecha",
};

interface DayViewProps {
  dateKey: string;
  refreshKey: number;
  onChanged: () => void;
  onEditEvent: (event: EditableEvent) => void;
  onCreate: () => void;
}

export function DayView({ dateKey, refreshKey, onChanged, onEditEvent, onCreate }: DayViewProps) {
  const [items, setItems] = React.useState<DayItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [localKey, setLocalKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<DayResponse>(`/calendar/day/${dateKey}`)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudo cargar el día",
          description: error instanceof Error ? error.message : undefined,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, refreshKey, localKey]);

  async function handleDelete(id: number, mode?: "this" | "future" | "all") {
    setDeletingId(id);
    try {
      await api.delete(`/calendar/events/${id}${qs({ deleteRecurrence: mode })}`);
      toast({ title: "Evento eliminado" });
      setLocalKey((k) => k + 1);
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          icon={CalendarDays}
          title="Nada agendado para este día"
          description="Crea un evento o agenda una tarea con fecha para verla aquí."
          action={
            <Button size="sm" onClick={onCreate}>
              Crear evento
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        if (item.kind === "task") {
          return (
            <li
              key={`task-${item.id}`}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 sm:p-4"
            >
              <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-text-2">
                {item.time ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">✅ Tarea</Badge>
                  <Badge variant="neutral">{TASK_STATUS_LABEL[item.status] ?? item.status}</Badge>
                  {item.urgent ? <Badge variant="danger">Urgente</Badge> : null}
                </div>
                <p
                  className={cn(
                    "mt-1.5 text-sm text-text",
                    item.status === "done" && "text-text-3 line-through"
                  )}
                >
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-1 text-xs text-text-2">{item.description}</p>
                ) : null}
              </div>
            </li>
          );
        }

        const meta = categoryMeta(item.category);
        const recurring = item.recurrenceId !== null;

        return (
          <li
            key={`event-${item.id}`}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 sm:p-4"
          >
            <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-text-2">{item.time}</span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", meta.bg, meta.border, meta.text)}>
                  <span aria-hidden>{meta.icon}</span>
                  {meta.label}
                </Badge>
                {recurring ? (
                  <Badge variant="neutral">
                    <Repeat />
                    Recurrente
                  </Badge>
                ) : null}
                {item.reminders.length > 0 ? (
                  <Badge variant="neutral">
                    <Bell />
                    {item.reminders
                      .map((r) => `${REMIND_TYPE_LABEL[r.remindType]} ${r.remindTime}`)
                      .join(" · ")}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-1.5 text-sm font-medium text-text">{item.title}</p>

              {item.location ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-text-2">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {item.location}
                </p>
              ) : null}

              {item.meetingLink ? (
                <a
                  href={item.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Unirse a la reunión
                </a>
              ) : null}

              {item.notes ? <p className="mt-2 text-xs text-text-2">{item.notes}</p> : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Acciones del evento"
                  disabled={deletingId === item.id}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() =>
                    onEditEvent(
                      toEditable({
                        id: item.id,
                        title: item.title,
                        date: dateKey,
                        time: item.time,
                        category: item.category,
                        location: item.location,
                        meetingLink: item.meetingLink,
                        notes: item.notes,
                        recurrenceId: item.recurrenceId,
                        reminders: item.reminders,
                      })
                    )
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {recurring ? (
                  <>
                    <DropdownMenuLabel>Eliminar serie</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => handleDelete(item.id, "this")}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Solo este evento
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDelete(item.id, "future")}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Este y los siguientes
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDelete(item.id, "all")}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Toda la serie
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onSelect={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        );
      })}
    </ul>
  );
}

export default DayView;
