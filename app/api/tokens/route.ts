import crypto from "node:crypto";
import { z } from "zod";
import { API_TOKEN_PREFIX, hashApiToken, withAuth } from "@/lib/auth";
import { badRequest, created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";

const MAX_TOKENS = 10;

const createSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre al token").max(60),
});

// Gestión de tokens: solo con sesión de navegador (`sessionOnly`). Si un token
// pudiera crear o revocar tokens, uno filtrado se perpetuaría solo.

/** GET /api/tokens — sin el secreto (solo se muestra al crearlo). */
export const GET = withAuth(
  async () => {
    const tokens = await prisma.apiToken.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
    return ok(tokens);
  },
  { sessionOnly: true }
);

/** POST /api/tokens — devuelve el token en claro UNA sola vez. */
export const POST = withAuth(
  async ({ req }) => {
    const { name } = createSchema.parse(await req.json());

    if ((await prisma.apiToken.count()) >= MAX_TOKENS) {
      throw badRequest(`Máximo ${MAX_TOKENS} tokens: revoca alguno que no uses`);
    }

    const token = API_TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
    const row = await prisma.apiToken.create({
      data: { name, tokenHash: hashApiToken(token) },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
    return created({ ...row, token });
  },
  { sessionOnly: true }
);
