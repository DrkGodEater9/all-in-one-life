import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/streaks";

describe("computeStreak — diaria", () => {
  it("sin check-ins: estado 'new'", () => {
    expect(computeStreak("daily", [], "2026-10-01")).toMatchObject({ current: 0, best: 0, status: "new" });
  });

  it("días consecutivos hasta hoy: cuenta todos y está 'done'", () => {
    const r = computeStreak("daily", ["2026-09-29", "2026-09-30", "2026-10-01"], "2026-10-01");
    expect(r).toMatchObject({ current: 3, best: 3, doneToday: true, status: "done" });
  });

  it("si hoy aún no cumpliste pero ayer sí, sigue viva y 'due'", () => {
    const r = computeStreak("daily", ["2026-09-29", "2026-09-30"], "2026-10-01");
    expect(r).toMatchObject({ current: 2, doneToday: false, status: "due" });
  });

  it("si se pasó un día completo, se pierde (current 0) pero conserva la mejor", () => {
    const r = computeStreak("daily", ["2026-09-28", "2026-09-29"], "2026-10-01");
    expect(r).toMatchObject({ current: 0, best: 2, status: "lost" });
  });

  it("un hueco parte la racha: la mejor es la cadena más larga", () => {
    const r = computeStreak(
      "daily",
      ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-10", "2026-10-01"],
      "2026-10-01"
    );
    expect(r).toMatchObject({ current: 1, best: 3 });
  });

  it("cruza fin de mes y de año", () => {
    const r = computeStreak("daily", ["2025-12-31", "2026-01-01"], "2026-01-01");
    expect(r.current).toBe(2);
  });

  it("ignora check-ins duplicados", () => {
    expect(computeStreak("daily", ["2026-10-01", "2026-10-01"], "2026-10-01").current).toBe(1);
  });
});

describe("computeStreak — día sí, día no", () => {
  it("cumplir y descansar un día mantiene la racha ('rest' el día libre)", () => {
    const r = computeStreak("alternate", ["2026-09-29", "2026-10-01"], "2026-10-02");
    expect(r).toMatchObject({ current: 2, status: "rest" });
  });

  it("tras un día de descanso, al siguiente toca cumplir ('due')", () => {
    const r = computeStreak("alternate", ["2026-10-01"], "2026-10-03");
    expect(r).toMatchObject({ current: 1, status: "due" });
  });

  it("cumplir tras descansar continúa la racha", () => {
    const r = computeStreak("alternate", ["2026-10-01", "2026-10-03"], "2026-10-03");
    expect(r).toMatchObject({ current: 2, status: "done" });
  });

  it("dos días seguidos sin cumplir la pierde", () => {
    const r = computeStreak("alternate", ["2026-09-28", "2026-09-30"], "2026-10-03");
    expect(r).toMatchObject({ current: 0, best: 2, status: "lost" });
  });

  it("cumplir dos días seguidos también cuenta", () => {
    const r = computeStreak("alternate", ["2026-09-30", "2026-10-01"], "2026-10-01");
    expect(r.current).toBe(2);
  });
});
