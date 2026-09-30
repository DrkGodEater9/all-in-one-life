"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2, Plus } from "lucide-react";
import { cn, toDateKey } from "@/lib/utils";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/components/ui";
import {
  LABEL_COLORS,
  LABEL_COLOR_VAR,
  QUADRANTS,
  QUADRANT_GRID_ORDER,
  QUADRANT_META,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_STEPS,
  labelColorVar,
  type LabelColor,
  type QuadrantKey,
  type RecurrenceFrequency,
  type TaskDTO,
  type TaskLabelDTO,
  type TaskLabelWithCount,
  type TaskStatus,
} from "./constants";
import { QUADRANT_ICONS, STATUS_ICONS } from "./icons";

// ─────────────────────────────────────────
// Payload que el diálogo entrega al contenedor
// ─────────────────────────────────────────

export type TaskFormPayload = {
  title: string;
  description: string | null;
  quadrant: QuadrantKey;
  status: TaskStatus;
  date: string | null;
  time: string | null;
  labelIds: number[];
  recurrence: {
    frequency: RecurrenceFrequency;
    intervalN: number;
    endsOn: string | null;
  } | null;
};

// ─────────────────────────────────────────
// Formulario
// ─────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const formSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio").max(200, "Máximo 200 caracteres"),
    description: z.string().max(2000, "Máximo 2000 caracteres"),
    quadrant: z.enum(QUADRANTS),
    status: z.enum(TASK_STATUSES),
    hasDate: z.boolean(),
    date: z.string(),
    time: z.string(),
    recurring: z.boolean(),
    frequency: z.enum(RECURRENCE_FREQUENCIES),
    intervalN: z
      .number({ invalid_type_error: "Indica un número" })
      .int("Debe ser un entero")
      .min(1, "Mínimo 1")
      .max(365, "Máximo 365"),
    endsOn: z.string(),
    labelIds: z.array(z.number().int()),
  })
  .superRefine((values, ctx) => {
    if (values.hasDate && !DATE_RE.test(values.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Indica una fecha válida",
      });
    }
    if (values.recurring && values.endsOn && !DATE_RE.test(values.endsOn)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message: "Indica una fecha válida",
      });
    }
    if (values.recurring && !values.hasDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hasDate"],
        message: "Una tarea recurrente necesita una fecha de inicio",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

function buildDefaults(
  task: TaskDTO | null,
  defaultQuadrant: QuadrantKey
): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    quadrant: task?.quadrant ?? defaultQuadrant,
    status: task?.status ?? "pending",
    hasDate: Boolean(task?.date),
    date: task?.date ?? toDateKey(),
    time: task?.time ?? "",
    recurring: Boolean(task?.recurrence),
    frequency: task?.recurrence?.frequency ?? "weekly",
    intervalN: task?.recurrence?.intervalN ?? 1,
    endsOn: task?.recurrence?.endsOn ?? "",
    labelIds: task?.labels.map((label) => label.id) ?? [],
  };
}

export type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = crear una tarea nueva. */
  task: TaskDTO | null;
  defaultQuadrant?: QuadrantKey;
  labels: TaskLabelWithCount[];
  onCreateLabel: (name: string, color: LabelColor) => Promise<TaskLabelDTO | null>;
  onSubmit: (payload: TaskFormPayload, task: TaskDTO | null) => Promise<boolean>;
};

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultQuadrant = "do",
  labels,
  onCreateLabel,
  onSubmit,
}: TaskDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaults(task, defaultQuadrant),
  });

  React.useEffect(() => {
    if (open) reset(buildDefaults(task, defaultQuadrant));
  }, [open, task, defaultQuadrant, reset]);

  const quadrant = watch("quadrant");
  const status = watch("status");
  const hasDate = watch("hasDate");
  const recurring = watch("recurring");
  const selectedLabelIds = watch("labelIds");
  const frequency = watch("frequency");

  const [newLabelName, setNewLabelName] = React.useState("");
  const [newLabelColor, setNewLabelColor] = React.useState<LabelColor>("accent");
  const [creatingLabel, setCreatingLabel] = React.useState(false);

  function toggleLabel(id: number) {
    const current = selectedLabelIds ?? [];
    setValue(
      "labelIds",
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      { shouldDirty: true }
    );
  }

  async function handleCreateLabel() {
    const name = newLabelName.trim();
    if (!name || creatingLabel) return;
    setCreatingLabel(true);
    try {
      const label = await onCreateLabel(name, newLabelColor);
      if (label) {
        setValue("labelIds", [...(selectedLabelIds ?? []), label.id], {
          shouldDirty: true,
        });
        setNewLabelName("");
      }
    } finally {
      setCreatingLabel(false);
    }
  }

  const submit = handleSubmit(async (values) => {
    const payload: TaskFormPayload = {
      title: values.title.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      quadrant: values.quadrant,
      status: values.status,
      date: values.hasDate ? values.date : null,
      time: values.hasDate && values.time ? values.time : null,
      labelIds: values.labelIds,
      recurrence: values.recurring
        ? {
            frequency: values.frequency,
            intervalN: values.intervalN,
            endsOn: values.endsOn ? values.endsOn : null,
          }
        : null,
    };
    const success = await onSubmit(payload, task);
    if (success) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            El cuadrante define la urgencia y la importancia de la tarea.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-5">
            {/* Título y descripción */}
            <div className="space-y-2">
              <Label htmlFor="task-title">Título</Label>
              <Input
                id="task-title"
                placeholder="Qué hay que hacer"
                autoComplete="off"
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Descripción</Label>
              <Textarea
                id="task-description"
                rows={3}
                placeholder="Detalles, contexto, enlaces…"
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>

            {/* Selector visual de cuadrante */}
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium text-text-2">
                Cuadrante
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {QUADRANT_GRID_ORDER.map((key) => {
                  const meta = QUADRANT_META[key];
                  const Icon = QUADRANT_ICONS[key];
                  const active = quadrant === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setValue("quadrant", key, { shouldDirty: true })}
                      className={cn(
                        "flex items-start gap-2 rounded-md border p-2.5 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                        active
                          ? "border-accent bg-accent-soft"
                          : "border-border bg-surface-2 hover:border-text-3"
                      )}
                    >
                      <span
                        aria-hidden
                        className="mt-px shrink-0"
                        style={{ color: meta.cssVar }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-tight text-text">
                          {meta.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-text-3">
                          {meta.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Etiquetas */}
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              {labels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label) => {
                    const active = (selectedLabelIds ?? []).includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleLabel(label.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                          active
                            ? "border-accent bg-accent-soft text-text"
                            : "border-border bg-surface-2 text-text-2 hover:text-text"
                        )}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: labelColorVar(label.color) }}
                        />
                        {label.name}
                        {active ? <Check className="h-3 w-3" strokeWidth={2} /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-3">
                  Todavía no hay etiquetas. Crea la primera abajo.
                </p>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex shrink-0 items-center gap-1">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Color ${color}`}
                      aria-pressed={newLabelColor === color}
                      onClick={() => setNewLabelColor(color)}
                      className={cn(
                        "h-5 w-5 rounded-sm border transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                        newLabelColor === color ? "border-text" : "border-border"
                      )}
                    >
                      <span
                        aria-hidden
                        className="mx-auto block h-2 w-2 rounded-full"
                        style={{ backgroundColor: LABEL_COLOR_VAR[color] }}
                      />
                    </button>
                  ))}
                </div>
                <Input
                  value={newLabelName}
                  onChange={(event) => setNewLabelName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleCreateLabel();
                    }
                  }}
                  placeholder="Nueva etiqueta"
                  maxLength={40}
                  className="h-8 flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!newLabelName.trim() || creatingLabel}
                  onClick={() => void handleCreateLabel()}
                >
                  {creatingLabel ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Crear
                </Button>
              </div>
            </div>

            {/* Stepper de estado */}
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-text-2">Estado</legend>
              <div className="flex items-center gap-1">
                {TASK_STATUS_STEPS.map((step, index) => {
                  const Icon = STATUS_ICONS[step];
                  const currentIndex = TASK_STATUS_STEPS.indexOf(status);
                  const reached = index <= currentIndex;
                  return (
                    <React.Fragment key={step}>
                      {index > 0 ? (
                        <span
                          aria-hidden
                          className={cn(
                            "h-px flex-1 transition-colors",
                            reached ? "bg-accent" : "bg-border"
                          )}
                        />
                      ) : null}
                      <button
                        type="button"
                        aria-pressed={status === step}
                        onClick={() => setValue("status", step, { shouldDirty: true })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                          status === step
                            ? "border-accent bg-accent-soft text-text"
                            : reached
                              ? "border-border bg-surface-2 text-text-2"
                              : "border-border bg-transparent text-text-3 hover:text-text-2"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {TASK_STATUS_LABELS[step]}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </fieldset>

            {/* Fecha y hora */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="task-has-date" className="cursor-pointer">
                  Con fecha
                </Label>
                <Switch
                  id="task-has-date"
                  checked={hasDate}
                  onCheckedChange={(checked) => {
                    setValue("hasDate", checked, { shouldDirty: true });
                    if (!checked) {
                      setValue("time", "");
                      setValue("recurring", false);
                    }
                  }}
                />
              </div>
              <FieldError message={errors.hasDate?.message} />

              {hasDate ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-date" className="text-[11px] text-text-3">
                      Fecha
                    </Label>
                    <Input id="task-date" type="date" {...register("date")} />
                    <FieldError message={errors.date?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="task-time" className="text-[11px] text-text-3">
                      Hora (opcional)
                    </Label>
                    <Input id="task-time" type="time" {...register("time")} />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Recurrencia */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="task-recurring" className="cursor-pointer">
                    Recurrente
                  </Label>
                  <p className="mt-0.5 text-[11px] text-text-3">
                    Al completarla se crea la siguiente ocurrencia.
                  </p>
                </div>
                <Switch
                  id="task-recurring"
                  checked={recurring}
                  onCheckedChange={(checked) => {
                    setValue("recurring", checked, { shouldDirty: true });
                    if (checked && !hasDate) setValue("hasDate", true);
                  }}
                />
              </div>

              {recurring ? (
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-text-3">Frecuencia</Label>
                    <Select
                      value={frequency}
                      onValueChange={(value) =>
                        setValue("frequency", value as RecurrenceFrequency, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_FREQUENCIES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {RECURRENCE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="task-interval"
                      className="text-[11px] text-text-3"
                    >
                      Cada
                    </Label>
                    <Input
                      id="task-interval"
                      type="number"
                      min={1}
                      max={365}
                      className="num"
                      {...register("intervalN", { valueAsNumber: true })}
                    />
                    <FieldError message={errors.intervalN?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task-ends-on" className="text-[11px] text-text-3">
                      Termina el
                    </Label>
                    <Input id="task-ends-on" type="date" {...register("endsOn")} />
                    <FieldError message={errors.endsOn?.message} />
                  </div>
                </div>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {task ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] leading-4 text-red">{message}</p>;
}
