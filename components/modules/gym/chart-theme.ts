// Estilos comunes de las gráficas del módulo Gym.
// Sin grid decorativo, ejes en text-3 y tooltip sobre surface con borde.

export const axisProps = {
  stroke: "var(--color-border)",
  tick: { fill: "var(--color-text-3)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--color-border)" },
} as const;

export const tooltipProps = {
  cursor: { stroke: "var(--color-border)" },
  contentStyle: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-text)",
  },
  labelStyle: { color: "var(--color-text-2)", fontSize: 11 },
  itemStyle: { color: "var(--color-text)" },
} as const;

export const lineProps = {
  stroke: "var(--color-accent)",
  strokeWidth: 2,
  dot: { r: 3, fill: "var(--color-accent)", stroke: "var(--color-accent)" },
  activeDot: { r: 4 },
  isAnimationActive: false,
} as const;
