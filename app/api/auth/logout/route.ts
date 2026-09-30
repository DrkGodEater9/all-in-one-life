import { createClient } from "@/lib/supabase/server";
import { withRoute } from "@/lib/auth";
import { ok } from "@/lib/http";

export const POST = withRoute(async () => {
  const supabase = createClient();
  await supabase.auth.signOut();
  return ok({ success: true });
});
