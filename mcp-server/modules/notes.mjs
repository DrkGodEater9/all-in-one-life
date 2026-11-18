import { z, call, qs, clean, today, DATE, ID } from "../lib.mjs";

/** Blog, conceptos y rachas: los módulos pequeños de texto y hábitos. */
export function register(tool) {
  // ── Blog ─────────────────────────────────────────────────────────────────
  tool(
    "list_posts",
    "Blog: lista las entradas (notas largas), con búsqueda y filtro por tag. Las fijadas primero.",
    { q: z.string().optional(), tag: z.string().optional() },
    (args) => call("GET", `/blog${qs(args)}`)
  );

  tool("get_post", "Blog: una entrada completa con sus enlaces.", { id: ID }, ({ id }) => call("GET", `/blog/${id}`));

  tool(
    "add_post",
    "Blog: crea una entrada. content admite texto largo (hasta 50.000 caracteres); máx. 10 tags.",
    {
      title: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).max(10).optional(),
      pinned: z.boolean().optional(),
    },
    (args) => call("POST", "/blog", args)
  );

  tool(
    "update_post",
    "Blog: modifica una entrada; solo se cambian los campos enviados.",
    {
      id: ID,
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).max(10).optional(),
      pinned: z.boolean().optional(),
    },
    ({ id, ...patch }) => call("PATCH", `/blog/${id}`, clean(patch))
  );

  tool("delete_post", "Blog: elimina una entrada. Irreversible: confírmalo antes.", { id: ID }, ({ id }) =>
    call("DELETE", `/blog/${id}`)
  );

  tool(
    "add_post_link",
    "Blog: agrega un enlace a documentos (Drive, Notion…) a una entrada.",
    { postId: ID, url: z.string().url(), title: z.string().optional() },
    ({ postId, ...body }) => call("POST", `/blog/${postId}/links`, body)
  );

  tool(
    "delete_post_link",
    "Blog: elimina un enlace de una entrada.",
    { postId: ID, linkId: ID },
    ({ postId, linkId }) => call("DELETE", `/blog/${postId}/links/${linkId}`)
  );

  // ── Conceptos ────────────────────────────────────────────────────────────
  tool(
    "list_concepts",
    "Conceptos: lista el glosario personal (alfabético), con búsqueda y filtro por área.",
    { q: z.string().optional(), topic: z.string().optional() },
    (args) => call("GET", `/concepts${qs(args)}`)
  );

  tool(
    "add_concept",
    "Conceptos: agrega un concepto al glosario.",
    { term: z.string(), definition: z.string(), topic: z.string().optional().describe("Área o categoría") },
    (args) => call("POST", "/concepts", args)
  );

  tool(
    "update_concept",
    "Conceptos: modifica un concepto; solo se cambian los campos enviados.",
    { id: ID, term: z.string().optional(), definition: z.string().optional(), topic: z.string().nullable().optional() },
    ({ id, ...patch }) => call("PATCH", `/concepts/${id}`, clean(patch))
  );

  tool("delete_concept", "Conceptos: elimina un concepto.", { id: ID }, ({ id }) => call("DELETE", `/concepts/${id}`));

  // ── Rachas ───────────────────────────────────────────────────────────────
  tool(
    "list_streaks",
    "Rachas: lista los hábitos con su racha actual, la mejor y si ya se marcó hoy.",
    { today: DATE.optional() },
    (args) => call("GET", `/streaks${qs({ today: args.today ?? today() })}`)
  );

  tool(
    "add_streak",
    "Rachas: crea un hábito. mode: daily (todos los días) o alternate (día sí, día no).",
    { name: z.string(), mode: z.enum(["daily", "alternate"]), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() },
    (args) => call("POST", "/streaks", args)
  );

  tool(
    "checkin_streak",
    "Rachas: marca (done=true) o desmarca (done=false) un día de un hábito. Fecha por defecto: hoy.",
    { id: ID, done: z.boolean(), date: DATE.optional() },
    ({ id, done, date }) => call("PUT", `/streaks/${id}/checkin`, { done, date: date ?? today() })
  );

  tool(
    "delete_streak",
    "Rachas: elimina un hábito con todo su historial. Irreversible: confírmalo antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/streaks/${id}`)
  );
}
