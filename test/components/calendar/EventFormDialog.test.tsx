import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventFormDialog } from "@/components/modules/calendar/EventFormDialog";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  qs: () => "",
}));

import { api } from "@/lib/api";

function renderDialog(overrides: Partial<React.ComponentProps<typeof EventFormDialog>> = {}) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <EventFormDialog
      open
      onOpenChange={onOpenChange}
      event={null}
      defaultDate="2026-01-01"
      onSaved={onSaved}
      {...overrides}
    />
  );
  return { onSaved, onOpenChange };
}

describe("EventFormDialog", () => {
  it("los campos de recurrencia están ocultos hasta activar 'Repetir evento'", () => {
    renderDialog();

    expect(screen.queryByLabelText("Frecuencia")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cada")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hasta (opcional)")).not.toBeInTheDocument();
  });

  it("activar el switch de recurrencia revela frecuencia, intervalo y fecha fin", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("switch", { name: /repetir evento/i }));

    expect(screen.getByLabelText("Frecuencia")).toBeInTheDocument();
    expect(screen.getByLabelText("Cada")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta (opcional)")).toBeInTheDocument();
  });

  it("desactivar el switch vuelve a ocultar los campos de recurrencia", async () => {
    const user = userEvent.setup();
    renderDialog();

    const toggle = screen.getByRole("switch", { name: /repetir evento/i });
    await user.click(toggle);
    expect(screen.getByLabelText("Frecuencia")).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByLabelText("Frecuencia")).not.toBeInTheDocument();
  });

  it("rechaza un link de reunión que no es una URL válida y no envía el formulario", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Título"), "Reunión de equipo");
    await user.type(screen.getByLabelText("Link de reunión (opcional)"), "no-es-una-url");
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    expect(await screen.findByText("El link debe ser una URL válida")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("acepta una URL de reunión válida y crea el evento", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      event: { id: 1 },
      occurrences: 1,
    });
    const { onSaved } = renderDialog();

    await user.type(screen.getByLabelText("Título"), "Reunión de equipo");
    await user.type(
      screen.getByLabelText("Link de reunión (opcional)"),
      "https://meet.google.com/abc-defg-hij"
    );
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      "/calendar/events",
      expect.objectContaining({
        title: "Reunión de equipo",
        meetingLink: "https://meet.google.com/abc-defg-hij",
      })
    );
  });

  it("no valida el link de reunión cuando queda vacío", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ event: { id: 1 }, occurrences: 1 });
    renderDialog();

    await user.type(screen.getByLabelText("Título"), "Sin link");
    await user.click(screen.getByRole("button", { name: /crear evento/i }));

    expect(screen.queryByText("El link debe ser una URL válida")).not.toBeInTheDocument();
  });
});
