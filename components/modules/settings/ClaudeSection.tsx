"use client";

import * as React from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  toast,
} from "@/components/ui";

interface TokenRow {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "nunca";
}

/** Tokens personales para conectar Claude Desktop (servidor MCP) a tu cuenta. */
export function ClaudeSection() {
  const [tokens, setTokens] = React.useState<TokenRow[]>([]);
  const [name, setName] = React.useState("Claude Desktop");
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    api.get<TokenRow[]>("/tokens").then(setTokens).catch(() => undefined);
  }, []);
  React.useEffect(load, [load]);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<TokenRow & { token: string }>("/tokens", { name: name.trim() });
      setFresh(res.token);
      load();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo crear el token",
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(t: TokenRow) {
    if (!window.confirm(`¿Revocar "${t.name}"? Lo que use este token dejará de funcionar.`)) return;
    try {
      await api.delete(`/tokens/${t.id}`);
      load();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo revocar",
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado" });
    } catch {
      toast({ variant: "destructive", title: "No se pudo copiar, selecciónalo a mano" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexión con Claude Desktop</CardTitle>
        <CardDescription>
          Un token le permite a Claude Desktop (por MCP) leer y modificar tus datos como tú. Trátalo como
          una contraseña: se muestra una sola vez y puedes revocarlo cuando quieras.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del token"
            aria-label="Nombre del token"
          />
          <Button onClick={create} disabled={creating || !name.trim()}>
            <KeyRound className="h-4 w-4" />
            {creating ? "Creando…" : "Crear token"}
          </Button>
        </div>

        {fresh ? (
          <div className="space-y-2 rounded-md border border-accent/40 bg-accent-soft p-3">
            <p className="text-xs text-text-2">Cópialo ahora; no se vuelve a mostrar:</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-text">{fresh}</code>
              <Button variant="secondary" size="icon-sm" aria-label="Copiar token" onClick={() => void copy(fresh)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFresh(null)}>
              Ya lo copié
            </Button>
          </div>
        ) : null}

        {tokens.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{t.name}</p>
                  <p className="text-xs text-text-3">
                    Creado {fmt(t.createdAt)} · último uso {fmt(t.lastUsedAt)}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Revocar ${t.name}`} onClick={() => void revoke(t)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-3">Aún no has creado ningún token.</p>
        )}
      </CardContent>
    </Card>
  );
}
