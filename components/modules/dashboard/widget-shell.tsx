"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface WidgetShellProps {
  href: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/**
 * Envoltorio común de los 6 widgets del dashboard home: toda la card es
 * clickable y navega al módulo correspondiente ("cada widget es clickable y
 * navega a su módulo", spec Módulo 0).
 */
export function WidgetShell({ href, title, icon: Icon, children, className }: WidgetShellProps) {
  return (
    <Link
      href={href}
      className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Card
        className={cn(
          "h-full transition-colors duration-150 group-hover:border-accent/40 group-hover:bg-surface-2/50",
          className
        )}
      >
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-text">
            <Icon className="h-4 w-4 text-text-2" strokeWidth={1.75} aria-hidden />
            {title}
          </CardTitle>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-text-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
            aria-hidden
          />
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </Link>
  );
}

/** Placeholder de carga: aproxima el alto del contenido real para no saltar el layout. */
export function WidgetSkeleton() {
  return (
    <div className="space-y-2.5 py-1">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/**
 * Estado de error aislado por widget: cada widget carga su propio dato, así
 * que si uno falla (API caída, 500, etc.) solo este texto discreto se ve
 * afectado y el resto del dashboard sigue funcionando con normalidad.
 */
export function WidgetError({ message }: { message?: string }) {
  return (
    <p className="py-2 text-xs text-danger">{message ?? "No se pudo cargar este widget."}</p>
  );
}
