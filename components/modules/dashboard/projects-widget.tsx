"use client";

import * as React from "react";
import { Lightbulb } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { Badge, EmptyState } from "@/components/ui";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "@/components/modules/projects/constants";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/components/modules/projects/types";
import { WidgetError, WidgetShell, WidgetSkeleton } from "./widget-shell";

type StatusCounts = Record<ProjectStatus, number>;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; counts: StatusCounts; total: number };

function emptyCounts(): StatusCounts {
  return Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as StatusCounts;
}

/**
 * Widget 6: el spec pide un semáforo verde/amarillo/rojo basado en
 * `viability`. En fase 1 ese campo siempre llega `null` desde la API
 * (ver el comentario en `prisma/schema.prisma` y en
 * `app/api/projects/_lib.ts`: "Fase 1 siempre manda null"), así que no hay
 * ningún proyecto en verde/amarillo/rojo todavía — mostrar tres ceros no le
 * dice nada al usuario.
 *
 * En su lugar contamos por `status` (idea / en progreso / pausado /
 * descartado / completado), que sí tiene datos reales desde el día uno y ya
 * es el campo que gobierna el kanban del módulo. El semáforo queda
 * preparado para fase 2: en cuanto `viability` deje de ser `null`, basta con
 * agrupar por ese campo aquí usando `VIABILITY_DOT_CLASS` /
 * `VIABILITY_LABEL`, ya definidos en `components/modules/projects/constants.ts`.
 */
export function ProjectsWidget() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    api
      .get<Project[]>("/projects")
      .then((projects) => {
        if (cancelled) return;
        const counts = emptyCounts();
        for (const project of projects) counts[project.status] += 1;
        setState({ status: "ready", counts, total: projects.length });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiClientError ? error.message : "No se pudieron cargar los proyectos",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell href="/projects" title="Proyectos" icon={Lightbulb}>
      {state.status === "loading" && <WidgetSkeleton />}
      {state.status === "error" && <WidgetError message={state.message} />}
      {state.status === "ready" &&
        (state.total === 0 ? (
          <EmptyState title="Todavía no hay proyectos" className="py-4" />
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {PROJECT_STATUSES.map((s) => (
              <li
                key={s}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5"
              >
                <Badge variant={STATUS_BADGE_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>
                <span className="font-mono text-sm text-text">{state.counts[s]}</span>
              </li>
            ))}
          </ul>
        ))}
    </WidgetShell>
  );
}
