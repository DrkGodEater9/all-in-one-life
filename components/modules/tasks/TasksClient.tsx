"use client";

import * as React from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { ApiClientError, api } from "@/lib/api";
import { toDateKey } from "@/lib/utils";
import {
  Button,
  Stat,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/components/ui";
import {
  OPEN_STATUSES,
  QUADRANT_FLAGS,
  quadrantOf,
  type LabelColor,
  type QuadrantKey,
  type TaskDTO,
  type TaskLabelDTO,
  type TaskLabelWithCount,
  type TaskStatus,
} from "./constants";
import { isOverdue } from "./format";
import { EisenhowerMatrix } from "./EisenhowerMatrix";
import { TaskList } from "./TaskList";
import { TaskDialog, type TaskFormPayload } from "./TaskDialog";
import { nextStatus } from "./TaskCard";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function TasksClient() {
  const [tasks, setTasks] = React.useState<TaskDTO[]>([]);
  const [labels, setLabels] = React.useState<TaskLabelWithCount[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskDTO | null>(null);
  const [dialogQuadrant, setDialogQuadrant] = React.useState<QuadrantKey>("do");

  const refresh = React.useCallback(async (withSkeleton = false) => {
    if (withSkeleton) setLoading(true);
    try {
      const [nextTasks, nextLabels] = await Promise.all([
        api.get<TaskDTO[]>("/tasks"),
        api.get<TaskLabelWithCount[]>("/tasks/labels"),
      ]);
      setTasks(nextTasks);
      setLabels(nextLabels);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las tareas",
        description: errorMessage(error, "Inténtalo de nuevo en un momento."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh(true);
  }, [refresh]);

  // ─────────────────────────────────────
  // Drag & drop de la matriz
  // ─────────────────────────────────────

  /**
   * Mover una card de cuadrante solo cambia `urgent`/`important`. Se aplica
   * primero en local (la card salta al instante) y se manda el PATCH; si la
   * petición falla se restaura la instantánea previa.
   */
  const handleMove = React.useCallback(async (task: TaskDTO, quadrant: QuadrantKey) => {
    const flags = QUADRANT_FLAGS[quadrant];
    // Revert por id, no snapshot del array completo: si otra tarjeta cambia
    // (otro drag, completarla, borrarla) MIENTRAS este PATCH está en vuelo
    // y el PATCH falla, un `setTasks(snapshot)` con el array entero pisaría
    // ese otro cambio ya aplicado y confirmado — el usuario vería su otra
    // acción "deshacerse" sola, sin error visible para ella. Guardar solo
    // los flags anteriores de ESTA tarea y revertir solo esa entrada evita
    // el problema sin importar qué más haya cambiado mientras tanto.
    const previousFlags = { urgent: task.urgent, important: task.important };

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, ...flags, quadrant: quadrantOf(flags.urgent, flags.important) }
          : item
      )
    );

    try {
      const updated = await api.patch<TaskDTO>(`/tasks/${task.id}`, flags);
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                ...previousFlags,
                quadrant: quadrantOf(previousFlags.urgent, previousFlags.important),
              }
            : item
        )
      );
      toast({
        variant: "destructive",
        title: "No se pudo mover la tarea",
        description: errorMessage(error, "El cambio se revirtió."),
      });
    }
  }, []);

  // ─────────────────────────────────────
  // Estado, borrado y guardado
  // ─────────────────────────────────────

  const handleAdvanceStatus = React.useCallback(
    async (task: TaskDTO) => {
      const status: TaskStatus = nextStatus(task.status);
      const previousStatus = task.status; // revert por id, no snapshot del array

      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, status } : item))
      );

      try {
        const updated = await api.patch<TaskDTO>(`/tasks/${task.id}/status`, {
          status,
        });
        setTasks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );

        if (status === "done" && updated.recurrence) {
          await refresh();
          toast({
            title: "Tarea completada",
            description: "Se generó la siguiente ocurrencia de la serie.",
          });
        }
      } catch (error) {
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id ? { ...item, status: previousStatus } : item
          )
        );
        toast({
          variant: "destructive",
          title: "No se pudo cambiar el estado",
          description: errorMessage(error, "El cambio se revirtió."),
        });
      }
    },
    [refresh]
  );

  const handleDelete = React.useCallback(async (task: TaskDTO) => {
    if (!window.confirm(`¿Eliminar la tarea «${task.title}»?`)) return;
    setTasks((current) => current.filter((item) => item.id !== task.id));

    try {
      await api.delete(`/tasks/${task.id}`);
      toast({ title: "Tarea eliminada" });
    } catch (error) {
      // Reinserta solo esta tarea (si no volvió por otra vía mientras tanto).
      setTasks((current) =>
        current.some((item) => item.id === task.id) ? current : [...current, task]
      );
      toast({
        variant: "destructive",
        title: "No se pudo eliminar la tarea",
        description: errorMessage(error, "Inténtalo de nuevo."),
      });
    }
  }, []);

  const handleCreateLabel = React.useCallback(
    async (name: string, color: LabelColor): Promise<TaskLabelDTO | null> => {
      try {
        const label = await api.post<TaskLabelWithCount>("/tasks/labels", {
          name,
          color,
        });
        setLabels((current) =>
          [...current, label].sort((a, b) => a.name.localeCompare(b.name))
        );
        return label;
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo crear la etiqueta",
          description: errorMessage(error, "Revisa que el nombre no exista ya."),
        });
        return null;
      }
    },
    []
  );

  const handleSubmit = React.useCallback(
    async (payload: TaskFormPayload, task: TaskDTO | null): Promise<boolean> => {
      const body = {
        title: payload.title,
        description: payload.description,
        quadrant: payload.quadrant,
        status: payload.status,
        date: payload.date,
        time: payload.time,
        labelIds: payload.labelIds,
        recurrence: payload.recurrence,
      };

      try {
        if (task) {
          await api.put<TaskDTO>(`/tasks/${task.id}`, body);
          toast({ title: "Tarea actualizada" });
        } else {
          await api.post<TaskDTO>("/tasks", body);
          toast({ title: "Tarea creada" });
        }
        await refresh();
        return true;
      } catch (error) {
        toast({
          variant: "destructive",
          title: task ? "No se pudo guardar" : "No se pudo crear la tarea",
          description: errorMessage(error, "Revisa los datos e inténtalo de nuevo."),
        });
        return false;
      }
    },
    [refresh]
  );

  // ─────────────────────────────────────
  // Apertura del modal
  // ─────────────────────────────────────

  const openCreate = React.useCallback((quadrant: QuadrantKey = "do") => {
    setEditing(null);
    setDialogQuadrant(quadrant);
    setDialogOpen(true);
  }, []);

  const openEdit = React.useCallback((task: TaskDTO) => {
    setEditing(task);
    setDialogQuadrant(task.quadrant);
    setDialogOpen(true);
  }, []);

  // ─────────────────────────────────────
  // Derivados
  // ─────────────────────────────────────

  const openTasks = React.useMemo(
    () => tasks.filter((task) => OPEN_STATUSES.includes(task.status)),
    [tasks]
  );

  const summary = React.useMemo(() => {
    const today = toDateKey();
    return {
      open: openTasks.length,
      urgentImportant: openTasks.filter((t) => t.quadrant === "do").length,
      overdue: openTasks.filter((t) => isOverdue(t.date)).length,
      // `doneAt` es un ISO en UTC: hay que pasarlo a día local antes de comparar.
      doneToday: tasks.filter(
        (t) => t.status === "done" && t.doneAt && toDateKey(new Date(t.doneAt)) === today
      ).length,
    };
  }, [openTasks, tasks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-4">
        <Stat label="Abiertas" value={summary.open} />
        <Stat
          label="Hacer ya"
          value={summary.urgentImportant}
          valueClassName={summary.urgentImportant > 0 ? "text-red" : undefined}
        />
        <Stat
          label="Vencidas"
          value={summary.overdue}
          valueClassName={summary.overdue > 0 ? "text-yellow" : undefined}
        />
        <Stat label="Hechas hoy" value={summary.doneToday} />
      </div>

      <Tabs defaultValue="matrix">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="matrix">
              <LayoutGrid />
              Matriz
            </TabsTrigger>
            <TabsTrigger value="list">
              <List />
              Lista
            </TabsTrigger>
          </TabsList>

          <Button size="sm" onClick={() => openCreate("do")}>
            <Plus />
            Nueva tarea
          </Button>
        </div>

        <TabsContent value="matrix">
          <EisenhowerMatrix
            tasks={openTasks}
            loading={loading}
            onMove={handleMove}
            onCreate={openCreate}
            onOpen={openEdit}
            onAdvanceStatus={handleAdvanceStatus}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="list">
          <TaskList
            tasks={tasks}
            labels={labels}
            loading={loading}
            onOpen={openEdit}
            onAdvanceStatus={handleAdvanceStatus}
            onDelete={handleDelete}
            onCreate={() => openCreate("do")}
          />
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        defaultQuadrant={dialogQuadrant}
        labels={labels}
        onCreateLabel={handleCreateLabel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default TasksClient;
