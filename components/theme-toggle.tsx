"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isLight = theme === "light";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Activar tema oscuro" : "Activar tema claro"}
      title={isLight ? "Tema oscuro" : "Tema claro"}
    >
      {/* Sin icono hasta montar: evita el mismatch de hidratación. */}
      {mounted ? (
        isLight ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )
      ) : (
        <span className="h-4 w-4" />
      )}
    </Button>
  );
}
