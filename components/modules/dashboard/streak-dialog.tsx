"use client";

import * as React from "react";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@/components/ui";
import { Segmented } from "@/components/modules/finance/segmented";
import type { StreakMode } from "@/lib/streaks";
import type { Streak } from "./streak-types";

export const STREAK_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
];

export interface StreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (streak: Streak) => void;
}

export function StreakDialog({ open, onOpenChange, onCreated }: StreakDialogProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(STREAK_COLORS[0]);
  const [mode, setMode] = React.useState<StreakMode>("daily");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setColor(STREAK_COLORS[0]);
      setMode("daily");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponle un nombre");
      return;
    }
    setSaving(true);
    try {
      const streak = await api.post<Streak>("/streaks", { name: name.trim(), color, mode });
      toast({ title: "Racha creada" });
      onOpenChange(false);
      onCreated(streak);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la racha",
        description: err instanceof ApiClientError ? err.message : "Inténtalo de nuevo",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva racha</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <DialogBody className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="streak-name">Nombre</Label>
              <Input
                id="streak-name"
                placeholder="Ej: Gym, Leer, Meditar…"
                autoFocus
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error ? <p className="text-xs text-danger">{error}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2.5">
                {STREAK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      color === c && "ring-2 ring-text"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de racha</Label>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "daily", label: "Diaria" },
                  { value: "alternate", label: "Día sí, día no" },
                ]}
                aria-label="Tipo de racha"
              />
              <p className="text-xs text-text-3">
                {mode === "daily"
                  ? "Cumples todos los días. Si se te pasa un día, se pierde."
                  : "Puedes descansar un día entre cumplimientos. Si pasan dos días seguidos sin cumplir, se pierde."}
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
