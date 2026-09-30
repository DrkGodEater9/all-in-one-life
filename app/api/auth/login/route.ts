import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withRoute } from "@/lib/auth";
import { ApiError, ok } from "@/lib/http";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const POST = withRoute(async ({ req }) => {
  const { email, password } = loginSchema.parse(await req.json());

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new ApiError(401, "Credenciales inválidas");

  return ok({ user: { id: data.user.id, email: data.user.email } });
});
