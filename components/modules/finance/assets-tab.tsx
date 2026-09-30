"use client";

import * as React from "react";
import { Boxes, Pencil, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/utils";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
  toast,
} from "@/components/ui";
import { AssetDialog } from "./asset-dialog";
import type { Asset } from "./types";

export interface AssetsTabProps {
  reloadKey: number;
  onChanged: () => void;
}

/** Formatea la cantidad quitando decimales inútiles (Decimal(12,4)). */
function quantityLabel(asset: Asset) {
  const decimals = Number.isInteger(asset.quantity) ? 0 : 2;
  const value = formatNumber(asset.quantity, decimals);
  return asset.unit ? `${value} ${asset.unit}` : value;
}

export function AssetsTab({ reloadKey, onChanged }: AssetsTabProps) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<Asset | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get<Asset[]>("/finance/assets")
      .then((data) => {
        if (!cancelled) setAssets(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudieron cargar los activos",
          description:
            error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleDelete(asset: Asset) {
    setDeletingId(asset.id);
    try {
      await api.delete(`/finance/assets/${asset.id}`);
      toast({ title: "Activo eliminado" });
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description:
          error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // El total estimado solo se muestra si TODOS los activos tienen precio.
  const allPriced = assets.length > 0 && assets.every((a) => a.priceEach != null);
  const estimatedTotal = allPriced
    ? Math.round(
        assets.reduce((acc, a) => acc + a.quantity * (a.priceEach ?? 0), 0) * 100
      ) / 100
    : null;

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="Aún no hay activos"
        description="Usa el botón + para registrar algo que poseas."
      />
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {assets.map((asset) => (
              <li
                key={asset.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm text-text">{asset.title}</p>
                  <p className="font-mono text-xs tabular-nums text-text-2">
                    {quantityLabel(asset)}
                  </p>
                  {asset.notes ? (
                    <p className="truncate text-xs text-text-3">{asset.notes}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {asset.priceEach != null ? (
                    <div className="text-right">
                      <p className="font-mono text-sm tabular-nums text-text">
                        {formatMoney(asset.quantity * asset.priceEach)}
                      </p>
                      <p className="font-mono text-[10px] tabular-nums text-text-3">
                        {formatMoney(asset.priceEach)} c/u
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-text-3">sin precio</span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar activo"
                    onClick={() => setEditing(asset)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Eliminar activo"
                    disabled={deletingId === asset.id}
                    onClick={() => handleDelete(asset)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {estimatedTotal !== null ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs uppercase tracking-wide text-text-3">
                Total estimado
              </span>
              <span className="font-mono text-sm tabular-nums text-text">
                {formatMoney(estimatedTotal)}
              </span>
            </div>
          ) : (
            <div className="border-t border-border px-4 py-3 text-[11px] text-text-3">
              El total estimado aparece cuando todos los activos tienen precio.
            </div>
          )}
        </CardContent>
      </Card>

      <AssetDialog
        open={editing !== null}
        asset={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
    </>
  );
}
