"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CircleCheck,
  Dumbbell,
  Home,
  Lightbulb,
  Salad,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navegación principal. La reutilizan BottomNav y Header. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/finance", label: "Finanzas", icon: Wallet },
  { href: "/nutrition", label: "Nutrición", icon: Salad },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/tasks", label: "Tareas", icon: CircleCheck },
  { href: "/projects", label: "Proyectos", icon: Lightbulb },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Configuración",
  icon: Settings,
};

/** `/` exige coincidencia exacta; el resto usa prefijo. */
export function isNavItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-accent-soft text-accent"
          : "text-text-2 hover:bg-surface-2 hover:text-text"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link
          href="/"
          className="text-xl tracking-tight text-text transition-colors hover:text-accent"
        >
          Personal OS
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <NavLink
          item={SETTINGS_ITEM}
          active={isNavItemActive(pathname, SETTINGS_ITEM.href)}
        />
        <div className="mt-2 flex items-center justify-between gap-2 px-2.5 pt-2">
          <span className="truncate text-xs text-text-3">Cuenta personal</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
