import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import TasksClient from "@/components/modules/tasks/TasksClient";
import type { TaskDTO } from "@/components/modules/tasks/constants";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  qs: (o: Record<string, unknown>) => "",
  ApiClientError: class ApiClientError extends Error {
    status: number;
    details?: unknown;
    constructor(status: number, message: string, details?: unknown) {
      super(message);
      this.status = status;
      this.details = details;
    }
  },
}));

/**
 * dnd-kit depende de eventos de puntero reales (PointerEvent, getBoundingClientRect)
 * que jsdom no reproduce de forma fiable. En vez de simular gestos de arrastre,
 * se sustituye `DndContext` por un passthrough que expone su `onDragEnd` para
 * invocarlo directamente con la forma exacta que dnd-kit le pasaría
 * (`{ active: { id }, over: { id } }`). Lo que se prueba no es dnd-kit — ya
 * probado por su propio paquete — sino la actualización optimista y el
 * revert de `TasksClient.handleMove`.
 */
let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null =
  null;

vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
    }) => {
      capturedOnDragEnd = onDragEnd;
      return children;
    },
    DragOverlay: () => null,
    useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      isDragging: false,
    }),
  };
});

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 1,
    title: "Tarea de prueba",
    description: null,
    urgent: false,
    important: false,
    status: "pending",
    date: null,
    time: null,
    quadrant: "eliminate",
    recurrence: null,
    calendarEventId: null,
    doneAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    labels: [],
    ...overrides,
  };
}

function regionFor(name: RegExp) {
  return screen.getByRole("region", { name });
}

describe("TasksClient — drag & drop optimista de la matriz", () => {
  beforeEach(() => {
    capturedOnDragEnd = null;
  });

  it("mueve la tarea de cuadrante al instante, antes de que resuelva el PATCH", async () => {
    const task = makeTask();
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/tasks") return [task] as never;
      if (path === "/tasks/labels") return [] as never;
      return [] as never;
    });

    let resolvePatch!: (value: TaskDTO) => void;
    vi.mocked(api.patch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        })
    );

    render(<TasksClient />);

    await screen.findByText("Tarea de prueba");
    expect(
      within(regionFor(/Eliminar/i)).getByText("Tarea de prueba")
    ).toBeInTheDocument();

    expect(capturedOnDragEnd).not.toBeNull();

    // Simula soltar la tarea sobre el cuadrante "Hacer ya" (do): urgente + importante.
    await act(async () => {
      capturedOnDragEnd!({ active: { id: "1" }, over: { id: "do" } });
    });

    // Optimista: ya aparece en "Hacer ya" sin esperar la respuesta del PATCH.
    expect(within(regionFor(/Hacer ya/i)).getByText("Tarea de prueba")).toBeInTheDocument();
    expect(
      within(regionFor(/Eliminar/i)).queryByText("Tarea de prueba")
    ).not.toBeInTheDocument();

    // Ahora resuelve el PATCH con la tarea confirmada por el servidor.
    await act(async () => {
      resolvePatch({ ...task, urgent: true, important: true, quadrant: "do" });
    });

    expect(within(regionFor(/Hacer ya/i)).getByText("Tarea de prueba")).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith("/tasks/1", { urgent: true, important: true });
  });

  it("revierte al cuadrante original si el PATCH falla", async () => {
    const task = makeTask();
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/tasks") return [task] as never;
      if (path === "/tasks/labels") return [] as never;
      return [] as never;
    });
    vi.mocked(api.patch).mockRejectedValue(new Error("network error"));

    render(<TasksClient />);

    await screen.findByText("Tarea de prueba");
    expect(capturedOnDragEnd).not.toBeNull();

    await act(async () => {
      capturedOnDragEnd!({ active: { id: "1" }, over: { id: "schedule" } });
    });

    // Espera a que el rechazo del PATCH se procese y revierta el estado.
    expect(
      await within(regionFor(/Eliminar/i)).findByText("Tarea de prueba")
    ).toBeInTheDocument();
    expect(
      within(regionFor(/Agendar/i)).queryByText("Tarea de prueba")
    ).not.toBeInTheDocument();
  });
});
