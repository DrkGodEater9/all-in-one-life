"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_LIST,
  EVENT_CATEGORIES,
  FREQUENCY_LABEL,
  RECURRENCE_FREQUENCIES,
  REMINDER_PRESETS,
  REMIND_TYPE_LABEL,
  type RemindType,
} from "./constants";
import type { CreateEventResponse, EditableEvent } from "./types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const formSchema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    time: z.string().regex(TIME_RE, "Hora inválida (HH:mm)"),
    category: z.enum(EVENT_CATEGORIES),
    location: z.string().max(200).optional(),
    meetingLink: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
    recurring: z.boolean(),
    frequency: z.enum(RECURRENCE_FREQUENCIES),
    intervalN: z.string().regex(/^\d{1,2}$/, "Intervalo inválido"),
    endsOn: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.meetingLink && values.meetingLink.trim()) {
      try {
        new URL(values.meetingLink.trim());
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["meetingLink"],
          message: "El link debe ser una URL válida",
        });
      }
    }
    if (values.recurring) {
      const n = Number(values.intervalN);
      if (!Number.isInteger(n) || n < 1 || n > 52) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["intervalN"],
          message: "Entre 1 y 52",
        });
      }
      if (values.endsOn && values.endsOn < values.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endsOn"],
          message: "La fecha fin no puede ser anterior al inicio",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface ReminderDraft {
  /** Presente solo si ya existe en la base (modo edición). */
  id?: number;
  remindType: RemindType;
  remindTime: string;
  daysBefore: number;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = crear. */
  event: EditableEvent | null;
  defaultDate: string;
  onSaved: () => void;
}

function emptyValues(date: string): FormValues {
  return {
    title: "",
    date,
    time: "09:00",
    category: "personal",
    location: "",
    meetingLink: "",
    notes: "",
    recurring: false,
    frequency: "weekly",
    intervalN: "1",
    endsOn: "",
  };
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSaved,
}: EventFormDialogProps) {
  const isEdit = event !== null;
  const [reminders, setReminders] = React.useState<ReminderDraft[]>([]);
  const [removedReminderIds, setRemovedReminderIds] = React.useState<number[]>([]);
  const [customTime, setCustomTime] = React.useState("08:00");
  const [customDaysBefore, setCustomDaysBefore] = React.useState("0");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(defaultDate),
  });

  // Rellena el formulario cada vez que se abre (crear o editar).
  React.useEffect(() => {
    if (!open) return;
    if (event) {
      reset({
        title: event.title,
        date: event.date,
        time: event.time,
        category: event.category,
        location: event.location ?? "",
        meetingLink: event.meetingLink ?? "",
        notes: event.notes ?? "",
        recurring: false,
        frequency: "weekly",
        intervalN: "1",
        endsOn: "",
      });
      setReminders(event.reminders.map((r) => ({ ...r })));
    } else {
      reset(emptyValues(defaultDate));
      setReminders([]);
    }
    setRemovedReminderIds([]);
  }, [open, event, defaultDate, reset]);

  const recurring = watch("recurring");
  const category = watch("category");

  function addReminder(draft: ReminderDraft) {
    setReminders((current) => {
      const exists = current.some(
        (r) => r.remindType === draft.remindType && r.remindTime === draft.remindTime && r.daysBefore === draft.daysBefore
      );
      return exists ? current : [...current, draft];
    });
  }

  function removeReminder(index: number) {
    setReminders((current) => {
      const target = current[index];
      if (target?.id) setRemovedReminderIds((ids) => [...ids, target.id as number]);
      return current.filter((_, i) => i !== index);
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(),
      date: values.date,
      time: values.time,
      category: values.category,
      location: values.location?.trim() || null,
      meetingLink: values.meetingLink?.trim() || null,
      notes: values.notes?.trim() || null,
    };

    try {
      if (isEdit && event) {
        await api.put(`/calendar/events/${event.id}`, payload);

        await Promise.all(removedReminderIds.map((id) => api.delete(`/calendar/reminders/${id}`)));
        await Promise.all(
          reminders
            .filter((r) => !r.id)
            .map((r) =>
              api.post(`/calendar/events/${event.id}/reminders`, {
                remindType: r.remindType,
                remindTime: r.remindTime,
                daysBefore: r.daysBefore,
              })
            )
        );

        toast({ title: "Evento actualizado" });
      } else {
        const result = await api.post<CreateEventResponse>("/calendar/events", {
          ...payload,
          recurrence: values.recurring
            ? {
                frequency: values.frequency,
                intervalN: Number(values.intervalN),
                endsOn: values.endsOn || null,
              }
            : null,
          reminders: reminders.map((r) => ({
            remindType: r.remindType,
            remindTime: r.remindTime,
            daysBefore: r.daysBefore,
          })),
        });

        toast({
          title: "Evento creado",
          description:
            result.occurrences > 1 ? `Se agendaron ${result.occurrences} ocurrencias.` : undefined,
        });
      }

      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({
        variant: "destructive",
        title: isEdit ? "No se pudo actualizar" : "No se pudo crear el evento",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Los cambios aplican solo a esta ocurrencia."
              : "Agenda un evento, con recurrencia y recordatorios si los necesitas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">Título</Label>
              <Input id="event-title" placeholder="Cita con el cardiólogo" {...register("title")} />
              {errors.title ? <p className="text-xs text-danger">{errors.title.message}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-date">Fecha</Label>
                <Input id="event-date" type="date" {...register("date")} />
                {errors.date ? <p className="text-xs text-danger">{errors.date.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-time">Hora</Label>
                <Input id="event-time" type="time" {...register("time")} />
                {errors.time ? <p className="text-xs text-danger">{errors.time.message}</p> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORY_LIST.map((meta) => {
                  const active = category === meta.value;
                  return (
                    <button
                      key={meta.value}
                      type="button"
                      onClick={() => setValue("category", meta.value, { shouldDirty: true })}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs transition-colors",
                        active
                          ? cn(meta.bg, meta.border, meta.text)
                          : "border-border bg-surface-2 text-text-2 hover:text-text"
                      )}
                    >
                      <span aria-hidden>{meta.icon}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-location">Lugar (opcional)</Label>
              <Input id="event-location" placeholder="Clínica del Country" {...register("location")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-link">Link de reunión (opcional)</Label>
              <Input id="event-link" placeholder="https://meet.google.com/..." {...register("meetingLink")} />
              {errors.meetingLink ? (
                <p className="text-xs text-danger">{errors.meetingLink.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-notes">Notas (opcional)</Label>
              <Textarea id="event-notes" rows={3} {...register("notes")} />
            </div>

            {/* ── Recurrencia ─────────────────────────────── */}
            {isEdit ? (
              event?.recurrenceId ? (
                <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-text-2">
                  Este evento pertenece a una serie recurrente. Para cambiar la recurrencia, elimina
                  la serie y créala de nuevo.
                </p>
              ) : null
            ) : (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="event-recurring" className="cursor-pointer">
                    Repetir evento
                  </Label>
                  <Switch
                    id="event-recurring"
                    checked={recurring}
                    onCheckedChange={(checked) => setValue("recurring", checked)}
                  />
                </div>

                {recurring ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-frequency">Frecuencia</Label>
                      <Select
                        value={watch("frequency")}
                        onValueChange={(value) =>
                          setValue("frequency", value as FormValues["frequency"])
                        }
                      >
                        <SelectTrigger id="event-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_FREQUENCIES.map((f) => (
                            <SelectItem key={f} value={f}>
                              {FREQUENCY_LABEL[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="event-interval">Cada</Label>
                      <Input
                        id="event-interval"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        {...register("intervalN", {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/\D/g, "");
                          },
                        })}
                      />
                      {errors.intervalN ? (
                        <p className="text-xs text-danger">{errors.intervalN.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="event-ends">Hasta (opcional)</Label>
                      <Input id="event-ends" type="date" {...register("endsOn")} />
                      {errors.endsOn ? (
                        <p className="text-xs text-danger">{errors.endsOn.message}</p>
                      ) : null}
                    </div>

                    <p className="text-xs text-text-3 sm:col-span-3">
                      Se agendan ocurrencias hasta la fecha fin, con un tope de 2 años.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* ── Recordatorios ───────────────────────────── */}
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-text-2" />
                <Label>Recordatorios</Label>
              </div>

              <div className="flex flex-wrap gap-2">
                {REMINDER_PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      addReminder({
                        remindType: preset.remindType,
                        remindTime: preset.remindTime,
                        daysBefore: preset.daysBefore,
                      })
                    }
                  >
                    <Plus className="h-3 w-3" />
                    <span className="ml-1">{preset.label}</span>
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reminder-days" className="text-xs text-text-2">
                    Días antes
                  </Label>
                  <Input
                    id="reminder-days"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    className="w-20"
                    value={customDaysBefore}
                    onChange={(e) => setCustomDaysBefore(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reminder-time" className="text-xs text-text-2">
                    Hora
                  </Label>
                  <Input
                    id="reminder-time"
                    type="time"
                    className="w-28"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const days = customDaysBefore === "" ? Number.NaN : Number(customDaysBefore);
                    if (!TIME_RE.test(customTime) || !Number.isInteger(days) || days < 0 || days > 365) {
                      toast({
                        variant: "destructive",
                        title: "Recordatorio inválido",
                        description: "Revisa la hora (HH:mm) y los días antes (0–365).",
                      });
                      return;
                    }
                    addReminder({ remindType: "custom", remindTime: customTime, daysBefore: days });
                  }}
                >
                  Añadir personalizado
                </Button>
              </div>

              {reminders.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {reminders.map((reminder, index) => (
                    <li
                      key={reminder.id ?? `new-${index}`}
                      className="flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-1 text-xs text-text-2"
                    >
                      <span>
                        {REMIND_TYPE_LABEL[reminder.remindType]}
                        {reminder.remindType === "custom" ? ` (${reminder.daysBefore}d antes)` : ""} ·{" "}
                        <span className="font-mono">{reminder.remindTime}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReminder(index)}
                        aria-label="Quitar recordatorio"
                        className="text-text-3 transition-colors hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-text-3">Sin recordatorios.</p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EventFormDialog;
