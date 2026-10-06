"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS, SETTINGS_ITEM, isNavItemActive } from "@/components/layout/Sidebar";

export interface HeaderProps {
  title?: string;
  action?: React.ReactNode;
}

/**
 * Solo mobile. En el layout del spec el header aparece únicamente en la columna
 * mobile; en desktop la orientación la dan la sidebar y el PageHeader de cada
 * módulo, así que duplicar el título aquí sobraría.
 */
export function Header({ title, action }: HeaderProps) {
  const pathname = usePathname();

  const resolved =
    title ??
    [...NAV_ITEMS, SETTINGS_ITEM].find((item) =>
      isNavItemActive(pathname, item.href)
    )?.label ??
    "";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Link href="/" className="text-lg tracking-tight text-text">
          Personal OS
        </Link>
        <span className="sr-only">{resolved}</span>

        <div className="flex items-center gap-2">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
