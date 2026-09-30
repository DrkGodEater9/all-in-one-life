import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddSetForm } from "@/components/modules/gym/AddSetForm";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiClientError: class ApiClientError extends Error {},
  qs: () => "",
}));

import { api } from "@/lib/api";

describe("AddSetForm", () => {
  it("un ejercicio 'weight' muestra los campos kg y reps (no duración/distancia)", () => {
    render(
      <AddSetForm
        workoutId={1}
        exerciseName="Sentadilla"
        exerciseType="weight"
        onAdded={vi.fn()}
      />
    );

    expect(screen.getByLabelText("kg")).toBeInTheDocument();
    expect(screen.getByLabelText("reps")).toBeInTheDocument();
    expect(screen.queryByLabelText("min")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("km")).not.toBeInTheDocument();
  });

  it("un ejercicio 'bodyweight' muestra solo reps", () => {
    render(
      <AddSetForm
        workoutId={1}
        exerciseName="Dominadas"
        exerciseType="bodyweight"
        onAdded={vi.fn()}
      />
    );

    expect(screen.getByLabelText("reps")).toBeInTheDocument();
    expect(screen.queryByLabelText("kg")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("min")).not.toBeInTheDocument();
  });

  it("un ejercicio 'cardio' muestra duración (min/seg) y distancia, no kg/reps", () => {
    render(
      <AddSetForm workoutId={1} exerciseName="Trote" exerciseType="cardio" onAdded={vi.fn()} />
    );

    expect(screen.getByLabelText("min")).toBeInTheDocument();
    expect(screen.getByLabelText("seg")).toBeInTheDocument();
    expect(screen.getByLabelText("km")).toBeInTheDocument();
    expect(screen.queryByLabelText("kg")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("reps")).not.toBeInTheDocument();
  });

  it("envía el payload de tipo weight con exerciseType y los campos correctos", async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    vi.mocked(api.post).mockResolvedValue({
      id: 1,
      exerciseName: "Sentadilla",
      exerciseType: "weight",
      setNumber: 1,
      reps: 8,
      weightKg: 80,
      durationSecs: null,
      distanceKm: null,
      notes: null,
      volume: 640,
    });

    render(
      <AddSetForm workoutId={5} exerciseName="Sentadilla" exerciseType="weight" onAdded={onAdded} />
    );

    await user.type(screen.getByLabelText("kg"), "80");
    await user.type(screen.getByLabelText("reps"), "8");
    await user.click(screen.getByRole("button", { name: /serie/i }));

    expect(api.post).toHaveBeenCalledWith("/gym/workouts/5/sets", {
      exerciseName: "Sentadilla",
      exerciseType: "weight",
      weightKg: 80,
      reps: 8,
    });
    expect(onAdded).toHaveBeenCalled();
  });

  it("envía el payload de cardio combinando minutos y segundos en durationSecs", async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    vi.mocked(api.post).mockResolvedValue({} as any);

    render(<AddSetForm workoutId={5} exerciseName="Trote" exerciseType="cardio" onAdded={onAdded} />);

    await user.type(screen.getByLabelText("min"), "2");
    await user.type(screen.getByLabelText("seg"), "30");
    await user.type(screen.getByLabelText("km"), "0.5");
    await user.click(screen.getByRole("button", { name: /serie/i }));

    expect(api.post).toHaveBeenCalledWith("/gym/workouts/5/sets", {
      exerciseName: "Trote",
      exerciseType: "cardio",
      durationSecs: 150,
      distanceKm: 0.5,
    });
  });

  it("cardio sin distancia envía distanceKm: null", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({} as any);

    render(<AddSetForm workoutId={5} exerciseName="Trote" exerciseType="cardio" onAdded={vi.fn()} />);

    await user.type(screen.getByLabelText("min"), "1");
    await user.click(screen.getByRole("button", { name: /serie/i }));

    expect(api.post).toHaveBeenCalledWith(
      "/gym/workouts/5/sets",
      expect.objectContaining({ distanceKm: null })
    );
  });
});
