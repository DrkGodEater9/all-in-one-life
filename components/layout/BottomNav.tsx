"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  SETTINGS_ITEM,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/Sidebar";

/** Los que caben cómodos en 375px; el resto vive en el menú "Más". */
const PRIMARY_HREFS = ["/", "/tasks", "/calendar", "/finance"];

const PRIMARY_ITEMS = PRIMARY_HREFS.map(
  (href) => NAV_ITEMS.find((item) => item.href === href)
).filter((item): item is NavItem => Boolean(item));

const OVERFLOW_ITEMS: NavItem[] = [
  ...NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href)),
  SETTINGS_ITEM,
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Cerrar el menú al navegar.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const moreActive = OVERFLOW_ITEMS.some((item) => isNavItemActive(pathname, item.href));

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div
            role="dialog"
            aria-label="Más secciones"
            className="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-border bg-surface px-4 pt-3"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-text-2">Más secciones</span>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMoreOpen(false)}
                className="rounded-sm p-2 text-text-2 hover:bg-surface-2 hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {OVERFLOW_ITEMS.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border px-1 py-3 text-xs transition-colors",
                        active
                          ? "border-accent/40 bg-accent-soft text-accent"
                          : "border-border bg-surface-2 text-text-2 hover:text-text"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                      <span className="max-w-full truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[color-mix(in_srgb,var(--color-bg)_95%,transparent)] backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                    active ? "text-accent" : "text-text-3 hover:text-text-2"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  <span className="max-w-full truncate px-0.5 text-[10px] leading-none">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex w-full min-w-0 flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                moreActive || moreOpen ? "text-accent" : "text-text-3 hover:text-text-2"
              )}
            >
              <Ellipsis className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[10px] leading-none">Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
