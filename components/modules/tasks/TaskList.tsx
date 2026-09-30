"use client";

import * as React from "react";
import { ListChecks, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Button,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";
import {
  QUADRANTS,
  QUADRANT_GRID_ORDER,
  QUADRANT_META,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type QuadrantKey,
  type TaskDTO,
  type TaskLabelWithCount,
  type TaskStatus,
} from "./constants";
import { dateGroupLabel } from "./format";
import { TaskCard } from "./TaskCard";

const ALL = "all";

type GroupBy = "none" | "quadrant" | "label" | "date";

const GROUP_LABELS: Record<GroupBy, string> = {
  none: "Sin agrupar",
  quadrant: "Cuadrante",
  label: "Etiqueta",
  date: "Fecha",
};

type TaskListProps = {
  tasks: TaskDTO[];
  labels: TaskLabelWithCount[];
  loading?: boolean;
  onOpen: (task: TaskDTO) => void;
  onAdvanceStatus: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
  onCreate: () => void;
};

export function TaskList({
  tasks,
  labels,
  loading = false,
  onOpen,
  onAdvanceStatus,
  onDelete,
  onCreate,
}: TaskListProps) {
  const [status, setStatus] = React.useState<string>(ALL);
  const [labelId, setLabelId] = React.useState<string>(ALL);
  const [quadrant, setQuadrant] = React.useState<string>(ALL);
  const [date, setDate] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("none");

  const hasFilters =
    status !== ALL || labelId !== ALL || quadrant !== ALL || date !== "" || search !== "";

  function clearFilters() {
    setStatus(ALL);
    setLabelId(ALL);
    setQuadrant(ALL);
    setDate("");
    setSearch("");
  }

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (status !== ALL && task.status !== status) return false;
      if (quadrant !== ALL && task.quadrant !== quadrant) return false;
      if (date && task.date !== date) return false;
      if (labelId !== ALL && !task.labels.some((l) => String(l.id) === labelId)) {
        return false;
      }
      if (needle) {
        const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [tasks, status, quadrant, date, labelId, search]);

  const groups = React.useMemo(
    () => buildGroups(filtered, groupBy),
    [filtered, groupBy]
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="task-search" className="text-[11px] text-text-3">
              Buscar
            </Label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3"
              />
              <Input
                id="task-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Título o descripción"
                className="pl-8"
              />
            </div>
          </div>

          <FilterSelect
            id="task-filter-status"
            label="Estado"
            value={status}
            onChange={setStatus}
            options={[
              { value: ALL, label: "Todos" },
              ...TASK_STATUSES.map((value) => ({
                value,
                label: TASK_STATUS_LABELS[value as TaskStatus],
              })),
            ]}
          />

          <FilterSelect
            id="task-filter-quadrant"
            label="Cuadrante"
            value={quadrant}
            onChange={setQuadrant}
            options={[
              { value: ALL, label: "Todos" },
              ...QUADRANTS.map((value) => ({
                value,
                label: QUADRANT_META[value as QuadrantKey].title,
              })),
            ]}
          />

          <FilterSelect
            id="task-filter-label"
            label="Etiqueta"
            value={labelId}
            onChange={setLabelId}
            options={[
              { value: ALL, label: "Todas" },
              ...labels.map((label) => ({
                value: String(label.id),
                label: label.name,
              })),
            ]}
          />

          <div className="space-y-1.5">
            <Label htmlFor="task-filter-date" className="text-[11px] text-text-3">
              Fecha
            </Label>
            <Input
              id="task-filter-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-3">Agrupar por</span>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(GROUP_LABELS) as GroupBy[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={groupBy === key}
                  onClick={() => setGroupBy(key)}
                  className={cn(
                    "rounded-sm border px-2 py-1 text-[11px] leading-4 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                    groupBy === key
                      ? "border-accent bg-accent-soft text-text"
                      : "border-border bg-surface-2 text-text-2 hover:text-text"
                  )}
                >
                  {GROUP_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="num text-[11px] text-text-3">
              {filtered.length} de {tasks.length}
            </span>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={ListChecks}
            title={hasFilters ? "Ningún resultado" : "Todavía no hay tareas"}
            description={
              hasFilters
                ? "Prueba a relajar los filtros o a buscar otra cosa."
                : "Crea la primera y empieza a clasificarla en la matriz."
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={onCreate}>
                  Nueva tarea
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              {group.title ? (
                <div className="flex items-center gap-2">
                  {group.accent ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: group.accent }}
                    />
                  ) : null}
                  <h3 className="text-xs font-medium uppercase tracking-wide text-text-2">
                    {group.title}
                  </h3>
                  <span className="num text-[11px] text-text-3">
                    {group.tasks.length}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </div>
              ) : null}

              <ul className="space-y-2">
                {group.tasks.map((task) => (
                  <li key={`${group.key}-${task.id}`}>
                    <TaskCard
                      task={task}
                      onOpen={onOpen}
                      onAdvanceStatus={onAdvanceStatus}
                      onDelete={onDelete}
                      className="bg-surface"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Agrupación
// ─────────────────────────────────────────

type Group = {
  key: string;
  title: string | null;
  accent?: string;
  tasks: TaskDTO[];
};

function buildGroups(tasks: TaskDTO[], groupBy: GroupBy): Group[] {
  if (groupBy === "none") {
    return [{ key: "all", title: null, tasks }];
  }

  if (groupBy === "quadrant") {
    return QUADRANT_GRID_ORDER.map((key) => ({
      key,
      title: QUADRANT_META[key].title,
      accent: QUADRANT_META[key].cssVar,
      tasks: tasks.filter((task) => task.quadrant === key),
    })).filter((group) => group.tasks.length > 0);
  }

  if (groupBy === "label") {
    const byLabel = new Map<string, Group>();
    for (const task of tasks) {
      if (task.labels.length === 0) {
        const group = byLabel.get("none") ?? {
          key: "none",
          title: "Sin etiqueta",
          tasks: [],
        };
        group.tasks.push(task);
        byLabel.set("none", group);
        continue;
      }
      // Una tarea con varias etiquetas aparece bajo cada una.
      for (const label of task.labels) {
        const key = `label-${label.id}`;
        const group = byLabel.get(key) ?? { key, title: label.name, tasks: [] };
        group.tasks.push(task);
        byLabel.set(key, group);
      }
    }
    return Array.from(byLabel.values()).sort(sortByTitleWithTrailingNone);
  }

  // groupBy === "date": las tareas sin fecha van al final.
  const byDate = new Map<string, Group>();
  for (const task of tasks) {
    const key = task.date ?? "zzzz-sin-fecha";
    const group = byDate.get(key) ?? {
      key,
      title: dateGroupLabel(task.date),
      tasks: [],
    };
    group.tasks.push(task);
    byDate.set(key, group);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => group);
}

function sortByTitleWithTrailingNone(a: Group, b: Group) {
  if (a.key === "none") return 1;
  if (b.key === "none") return -1;
  return (a.title ?? "").localeCompare(b.title ?? "");
}

// ─────────────────────────────────────────
// Select de filtro
// ─────────────────────────────────────────

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] text-text-3">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
