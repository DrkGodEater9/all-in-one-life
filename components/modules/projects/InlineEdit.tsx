"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Edición inline: se guarda al salir del campo (blur) o con Enter
 * (Cmd/Ctrl+Enter en el modo multilínea) y se cancela con Escape.
 * `onSave` debe lanzar si la petición falla; en ese caso se restaura el valor
 * original y el campo vuelve a modo lectura.
 */
export function InlineEdit({
  value,
  onSave,
  multiline = false,
  placeholder = "Sin contenido",
  label,
  displayClassName,
  inputClassName,
  maxLength,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  label: string;
  displayClassName?: string;
  inputClassName?: string;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const skipBlur = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Textarea que se expande con el contenido.
  useEffect(() => {
    const el = textareaRef.current;
    if (!editing || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  async function commit() {
    const next = draft.trim();
    if (next === value.trim()) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      setDraft(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    skipBlur.current = true;
    setDraft(value);
    setEditing(false);
  }

  const sharedClass = cn(
    "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-text",
    "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/40",
    "disabled:opacity-60",
    inputClassName
  );

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          skipBlur.current = false;
          setEditing(true);
        }}
        aria-label={`Editar ${label}`}
        className={cn(
          "-mx-2 block w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          multiline ? "whitespace-pre-wrap" : "truncate",
          !value ? "text-text-3" : undefined,
          displayClassName
        )}
      >
        {value || placeholder}
      </button>
    );
  }

  const commonProps = {
    autoFocus: true,
    disabled: saving,
    maxLength,
    value: draft,
    "aria-label": label,
    onBlur: () => {
      if (skipBlur.current) {
        skipBlur.current = false;
        return;
      }
      void commit();
    },
  };

  if (multiline) {
    return (
      <textarea
        {...commonProps}
        ref={textareaRef}
        rows={3}
        placeholder={placeholder}
        className={cn(sharedClass, "resize-none text-sm leading-relaxed")}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            skipBlur.current = true;
            void commit();
          }
        }}
      />
    );
  }

  return (
    <input
      {...commonProps}
      type="text"
      placeholder={placeholder}
      className={cn(sharedClass, displayClassName)}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          skipBlur.current = true;
          void commit();
        }
      }}
    />
  );
}
