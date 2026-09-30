"use client";

import * as React from "react";

/**
 * LIMITACIÓN CONOCIDA (fase 1): `prisma/schema.prisma` no tiene ninguna
 * tabla de configuración de usuario (no existe `Settings` / `UserPreferences`
 * en el spec, y este agente no puede tocar el schema). La zona horaria y el
 * objetivo de agua diario no tienen dónde persistir en base de datos, así
 * que viven en `localStorage` del navegador vía este hook.
 *
 * Consecuencias explícitas de esta limitación:
 *   - No sincronizan entre dispositivos ni navegadores.
 *   - Se pierden si el usuario borra los datos del sitio.
 *   - El cron de recordatorios (`/api/cron/reminders`, en el módulo
 *     Calendario) no puede leer la zona horaria del usuario porque corre en
 *     el servidor, sin acceso a `localStorage`.
 *
 * Cuando fase 2 agregue una tabla de settings en el backend, este hook es el
 * único lugar que hace falta cambiar: pasa a leer/escribir contra la API en
 * vez de `localStorage`, y el resto de `SettingsClient` no se entera.
 */

const STORAGE_KEY = "personal-os:preferences";

export const DEFAULT_WATER_GOAL_ML = 2000;

export interface Preferences {
  timezone: string;
  waterGoalMl: number;
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function defaultPreferences(): Preferences {
  return { timezone: browserTimezone(), waterGoalMl: DEFAULT_WATER_GOAL_ML };
}

function readStorage(): Preferences {
  if (typeof window === "undefined") return defaultPreferences();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      timezone:
        typeof parsed.timezone === "string" && parsed.timezone
          ? parsed.timezone
          : browserTimezone(),
      waterGoalMl:
        typeof parsed.waterGoalMl === "number" && parsed.waterGoalMl > 0
          ? parsed.waterGoalMl
          : DEFAULT_WATER_GOAL_ML,
    };
  } catch {
    return defaultPreferences();
  }
}

export interface UsePreferencesResult {
  preferences: Preferences;
  /** `false` hasta el primer efecto en el cliente (evita mismatch de hidratación). */
  hydrated: boolean;
  update: (patch: Partial<Preferences>) => void;
}

export function usePreferences(): UsePreferencesResult {
  const [preferences, setPreferences] = React.useState<Preferences>(defaultPreferences);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setPreferences(readStorage());
    setHydrated(true);
  }, []);

  const update = React.useCallback((patch: Partial<Preferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage puede fallar (modo privado, cuota llena, etc.); la
        // preferencia sigue viva en memoria para el resto de la sesión.
      }
      return next;
    });
  }, []);

  return { preferences, hydrated, update };
}
