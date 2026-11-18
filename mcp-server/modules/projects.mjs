import { z, call, qs, clean, ID } from "../lib.mjs";

const STATUS = z.enum(["idea", "en_progreso", "pausado", "descartado", "completado"]);

export function register(tool) {
  tool(
    "list_projects",
    "Proyectos: lista proyectos/ideas. Estados: idea, en_progreso, pausado, descartado, completado.",
    {
      status: STATUS.optional(),
      category: z.string().optional().describe("Id o nombre de la categoría"),
      tag: z.string().optional().describe("Nombre del tag"),
      q: z.string().optional().describe("Texto a buscar"),
    },
    (args) => call("GET", `/projects${qs(args)}`)
  );

  tool("get_project", "Proyectos: detalle de un proyecto con notas y enlaces.", { id: ID }, ({ id }) =>
    call("GET", `/projects/${id}`)
  );

  tool(
    "add_project",
    "Proyectos: crea un proyecto o idea. categoryId viene de list_project_categories; los tags que no existan se crean.",
    {
      title: z.string(),
      description: z.string().optional(),
      status: STATUS.optional().describe("Por defecto: idea"),
      categoryId: ID.optional(),
      tagNames: z.array(z.string()).optional(),
    },
    (args) => call("POST", "/projects", args)
  );

  tool(
    "update_project",
    "Proyectos: modifica un proyecto; solo se cambian los campos enviados (p. ej. status para moverlo de columna).",
    {
      id: ID,
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      status: STATUS.optional(),
      categoryId: ID.nullable().optional(),
      tagNames: z.array(z.string()).optional().describe("Reemplaza los tags del proyecto"),
    },
    ({ id, ...patch }) => call("PATCH", `/projects/${id}`, clean(patch))
  );

  tool("delete_project", "Proyectos: elimina un proyecto con sus notas y enlaces. Irreversible: confírmalo antes.", { id: ID }, ({ id }) =>
    call("DELETE", `/projects/${id}`)
  );

  tool(
    "add_project_note",
    "Proyectos: agrega una nota a un proyecto.",
    { projectId: ID, content: z.string() },
    ({ projectId, content }) => call("POST", `/projects/${projectId}/notes`, { content })
  );

  tool(
    "delete_project_note",
    "Proyectos: elimina una nota de un proyecto.",
    { projectId: ID, noteId: ID },
    ({ projectId, noteId }) => call("DELETE", `/projects/${projectId}/notes/${noteId}`)
  );

  tool(
    "add_project_link",
    "Proyectos: agrega un enlace (http/https) a un proyecto.",
    { projectId: ID, url: z.string().url(), title: z.string().optional() },
    ({ projectId, ...body }) => call("POST", `/projects/${projectId}/links`, body)
  );

  tool(
    "delete_project_link",
    "Proyectos: elimina un enlace de un proyecto.",
    { projectId: ID, linkId: ID },
    ({ projectId, linkId }) => call("DELETE", `/projects/${projectId}/links/${linkId}`)
  );

  tool("list_project_categories", "Proyectos: lista las categorías.", {}, () => call("GET", "/projects/categories"));

  tool("add_project_category", "Proyectos: crea una categoría.", { name: z.string() }, (args) =>
    call("POST", "/projects/categories", args)
  );

  tool("list_project_tags", "Proyectos: lista los tags.", {}, () => call("GET", "/projects/tags"));

  tool("add_project_tag", "Proyectos: crea un tag.", { name: z.string() }, (args) =>
    call("POST", "/projects/tags", args)
  );
}
