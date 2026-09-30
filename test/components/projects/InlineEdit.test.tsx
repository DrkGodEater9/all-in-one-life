import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InlineEdit } from "@/components/modules/projects/InlineEdit";

describe("InlineEdit", () => {
  it("guarda al perder el foco (blur) cuando el valor cambió", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<InlineEdit value="Original" onSave={onSave} label="título" />);

    await user.click(screen.getByRole("button", { name: /editar título/i }));
    const input = screen.getByRole("textbox", { name: "título" });
    await user.clear(input);
    await user.type(input, "Nuevo valor");
    await user.tab(); // blur

    expect(onSave).toHaveBeenCalledWith("Nuevo valor");
  });

  it("guarda con Enter en modo de una sola línea", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<InlineEdit value="Original" onSave={onSave} label="título" />);

    await user.click(screen.getByRole("button", { name: /editar título/i }));
    const input = screen.getByRole("textbox", { name: "título" });
    await user.clear(input);
    await user.type(input, "Con enter{Enter}");

    expect(onSave).toHaveBeenCalledWith("Con enter");
  });

  it("no llama a onSave si el valor no cambió", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<InlineEdit value="Sin cambios" onSave={onSave} label="título" />);

    await user.click(screen.getByRole("button", { name: /editar título/i }));
    const input = screen.getByRole("textbox", { name: "título" });
    await user.tab(); // blur sin editar nada

    expect(onSave).not.toHaveBeenCalled();
    // Vuelve a modo lectura mostrando el valor original.
    expect(screen.getByRole("button", { name: /editar título/i })).toHaveTextContent(
      "Sin cambios"
    );
  });

  it("no llama a onSave si el cambio es solo espacios en blanco alrededor", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<InlineEdit value="Texto" onSave={onSave} label="título" />);

    await user.click(screen.getByRole("button", { name: /editar título/i }));
    const input = screen.getByRole("textbox", { name: "título" });
    await user.type(input, "  ");
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("revierte visualmente al valor original si el guardado falla", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("fallo de red"));

    render(<InlineEdit value="Valor viejo" onSave={onSave} label="título" />);

    await user.click(screen.getByRole("button", { name: /editar título/i }));
    const input = screen.getByRole("textbox", { name: "título" });
    await user.clear(input);
    await user.type(input, "Valor que falla");
    await user.tab();

    expect(onSave).toHaveBeenCalledWith("Valor que falla");
    // Al fallar, vuelve a modo lectura con el valor ORIGINAL, no el fallido.
    const display = await screen.findByRole("button", { name: /editar título/i });
    expect(display).toHaveTextContent("Valor viejo");
  });

  it("cancela con Escape sin llamar a onSave", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<InlineEdit value="Original" onSave={onSave} label="título" />);

    await user.click(screen.getByRole("button", { name: /editar título/i }));
    const input = screen.getByRole("textbox", { name: "título" });
    await user.type(input, "Cambio que se cancela");
    await user.keyboard("{Escape}");

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /editar título/i })).toHaveTextContent("Original");
  });

  it("guarda con Cmd/Ctrl+Enter en modo multilínea", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <InlineEdit value="Descripción original" onSave={onSave} label="descripción" multiline />
    );

    await user.click(screen.getByRole("button", { name: /editar descripción/i }));
    const textarea = screen.getByRole("textbox", { name: "descripción" });
    await user.clear(textarea);
    await user.type(textarea, "Nueva descripción");
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(onSave).toHaveBeenCalledWith("Nueva descripción");
  });

  it("un Enter simple en modo multilínea NO guarda (solo agrega línea)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <InlineEdit value="Descripción original" onSave={onSave} label="descripción" multiline />
    );

    await user.click(screen.getByRole("button", { name: /editar descripción/i }));
    const textarea = screen.getByRole("textbox", { name: "descripción" });
    await user.type(textarea, "{Enter}");

    expect(onSave).not.toHaveBeenCalled();
  });
});
