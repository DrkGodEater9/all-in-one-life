"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectTag } from "./types";

/**
 * Editor de etiquetas por nombre. La API acepta `tagNames` y crea las que falten
 * (comparando sin distinguir mayúsculas), así que el cliente solo maneja nombres.
 */
export function TagPicker({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  className,
  placeholder = "Añadir etiqueta y Enter",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: ProjectTag[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const selectedKeys = new Set(value.map((v) => v.toLowerCase()));

  function add(raw: string) {
    const name = raw.trim().replace(/,+$/, "").trim();
    if (!name) return;
    if (selectedKeys.has(name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, name.slice(0, 50)]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  const available = suggestions.filter((t) => !selectedKeys.has(t.name.toLowerCase()));

  return (
    <div className={cn("space-y-2", className)}>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} className="pr-1">
              {name}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(name)}
                aria-label={`Quitar ${name}`}
                className="ml-0.5 rounded-sm p-0.5 text-accent/70 transition-colors hover:text-accent disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        disabled={disabled}
        maxLength={50}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (next.endsWith(",")) add(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
          if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {available.slice(0, 12).map((tag) => (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              onClick={() => add(tag.name)}
              className="rounded-sm border border-border px-2 py-0.5 text-[11px] text-text-2 transition-colors hover:border-accent/50 hover:text-text disabled:opacity-50"
            >
              + {tag.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
