import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";

export const GET = withAuth(async ({ user }) =>
  ok({ id: user.id, email: user.email })
);
