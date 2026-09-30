"use client";

import * as React from "react";
import { CircleCheck } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { QUADRANT_META, type MatrixDTO, type TaskDTO } from "@/components/modules/tasks/constants";
import { WidgetError, WidgetShell, WidgetSkeleton } from "./widget-shell";

const MAX_VISIBLE = 4;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TaskDTO[] };

const DO = QUADRANT_META.do;

/** Widget 4: el cuadrante "Hacer ya" (urgente + importante) con sus tareas pendientes. */
export function UrgentTasksWidget() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    api
      .get<MatrixDTO>("/tasks/matrix")
      .then((matrix) => {
        if (!cancelled) setState({ status: "ready", data: matrix.do });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiClientError ? error.message : "No se pudieron cargar las tareas",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell href="/tasks" title={`Tareas urgentes · ${DO.title}`} icon={CircleCheck}>
      {state.status === "loading" && <WidgetSkeleton />}
      {state.status === "error" && <WidgetError message={state.message} />}
      {state.status === "ready" &&
        (state.data.length === 0 ? (
          <EmptyState title="No hay tareas urgentes" className="py-4" />
        ) : (
          <ul className="space-y-2">
            {state.data.slice(0, MAX_VISIBLE).map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DO.dotClass)} aria-hidden />
                <span className="truncate text-sm text-text">{task.title}</span>
              </li>
            ))}
            {state.data.length > MAX_VISIBLE ? (
              <li className="pl-3.5 text-xs text-text-3">
                +{state.data.length - MAX_VISIBLE} más
              </li>
            ) : null}
          </ul>
        ))}
    </WidgetShell>
  );
}
