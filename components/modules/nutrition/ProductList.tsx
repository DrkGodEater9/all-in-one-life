"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Badge, Card, Checkbox, SectionHeader, Skeleton, toast } from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { formatCop } from "./RecipeDetailDialog";
import type { Product } from "./types";

/** Lista de productos del recetario con sus precios, agrupada por dónde se compra. */
export function ProductList() {
  const [products, setProducts] = React.useState<Product[] | null>(null);
  const [bought, setBought] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    api
      .get<Product[]>("/nutrition/products")
      .then(setProducts)
      .catch((error) => {
        setProducts([]);
        toast({
          title: "No se pudo cargar la lista de productos",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      });
  }, []);

  const stores = React.useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products ?? []) map.set(p.store, [...(map.get(p.store) ?? []), p]);
    return [...map.entries()];
  }, [products]);

  if (products === null) return <Skeleton className="h-40 w-full" />;
  if (products.length === 0) return null;

  const total = products.reduce((t, p) => t + p.priceCop, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-text">Lista de compras</h2>
        <span className="font-mono text-sm text-text">{formatCop(total)}</span>
      </div>

      {stores.map(([store, list]) => (
        <Card key={store} className="p-4">
          <SectionHeader
            title={store}
            description={`${formatCop(list.reduce((t, p) => t + p.priceCop, 0))} · ${list.length} productos`}
          />
          <ul className="mt-3 divide-y divide-border">
            {list.map((p) => {
              const done = bought.has(p.id);
              return (
                <li key={p.id} className="flex items-start gap-3 py-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={done}
                    aria-label={`Comprado: ${p.name}`}
                    onCheckedChange={(v) =>
                      setBought((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      })
                    }
                  />
                  <div className={"min-w-0 flex-1 " + (done ? "opacity-50" : "")}>
                    <p className={"text-sm text-text " + (done ? "line-through" : "")}>
                      {p.name}
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Ver ${p.name} en la tienda`}
                          className="ml-1.5 inline-block align-middle text-text-3 hover:text-text"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </p>
                    <p className="text-xs text-text-3">
                      {[p.quantity != null ? `${formatNumber(p.quantity)} ${p.unit ?? ""}`.trim() : p.unit, p.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {p.recipeCodes.length > 0 ? (
                      <p className="truncate font-mono text-[11px] text-text-3">{p.recipeCodes.join(" ")}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm text-text">{formatCop(p.priceCop)}</p>
                    {p.priceType === "estimado" ? (
                      <Badge variant="neutral" className="mt-0.5">
                        estimado
                      </Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
