# Personal OS para Claude Desktop (MCP)

Deja que Claude Desktop lea y modifique **todos los módulos** de la app: tareas, calendario,
finanzas, gym, nutrición, proyectos, blog, conceptos, rachas y empleo (114 herramientas).
Usa un token personal, así que solo ve los datos de su dueño.

## Instalación

1. En la app: **Configuración → Conexión con Claude Desktop → Crear token**. Cópialo (se muestra una vez).
2. En esta carpeta: `npm install`.
3. En Claude Desktop: **Configuración → Desarrollador → Editar configuración** y agrega:

```json
{
  "mcpServers": {
    "personal-os": {
      "command": "node",
      "args": ["C:\\ruta\\a\\all-in-one-life\\mcp-server\\index.mjs"],
      "env": {
        "POS_URL": "https://all-in-one-life.vercel.app",
        "POS_TOKEN": "pos_…tu token…"
      }
    }
  }
}
```

4. Reinicia Claude Desktop. Aparecen las herramientas de `personal-os`.

### Variables opcionales

| Variable | Para qué |
|---|---|
| `POS_MODULES` | Expone solo algunos módulos, separados por coma: `jobs,tasks,calendar,finance,gym,nutrition,projects,notes`. Por defecto todos. Con menos herramientas Claude acierta más y gasta menos contexto. |
| `POS_TIMEZONE` | Zona horaria para "hoy". Por defecto `America/Bogota`. |
| `POS_DOWNLOAD_DIR` | Dónde se guardan los Excel exportados. Por defecto tu carpeta `Descargas`. |

Ejemplo: `"POS_MODULES": "tasks,calendar,finance"`.

## Qué puede hacer

| Módulo (`POS_MODULES`) | Herramientas |
|---|---|
| `tasks` | `list_tasks`, `task_matrix`, `add_task`, `update_task`, `set_task_status`, `delete_task`, `list_task_labels`, `add_task_label`, `delete_task_label` |
| `calendar` | `list_events`, `get_calendar_day`, `list_task_days`, `add_event` (con recurrencia y recordatorios), `update_event`, `delete_event`, `add_event_reminder`, `delete_event_reminder` |
| `finance` | `get_balance`, `list_transactions`, `add_transaction`, `delete_transaction`, `monthly_summary`, `export_transactions_xlsx` (descarga un Excel), deudas (`list_debts`, `add_debt`, `pay_debt`, `list_debt_payments`), activos (`list_assets`, `add_asset`, `update_asset`, `delete_asset`), créditos (`list_credit_lines`, `get_credit_line`, `add_credit_line`, `update_credit_line`, `delete_credit_line`, `export_credit_line_xlsx`, `add_credit_movement`, `delete_credit_movement`) |
| `gym` | rutinas (`list_routines`, `add_routine`, `update_routine`, `delete_routine`), entrenos (`list_workouts`, `start_workout`, `get_workout`, `add_set`, `delete_set`, `finish_workout`), `list_exercises`, `exercise_history`, `exercise_record`, `gym_streak`, `list_measurements`, `add_measurement` |
| `nutrition` | `nutrition_summary`, `nutrition_log`, `log_food`, `delete_log_item`, `log_recipe`, recetas (`list_recipes`, `create_recipe`, `update_recipe`, `delete_recipe`), `search_food`, favoritos (`list_favorites`, `add_favorite`, `delete_favorite`), agua (`get_water`, `add_water`), peso (`list_weight`, `add_weight`), metas (`get_nutrition_goals`, `set_nutrition_goals`), `nutrition_history`, `nutrition_streak`, `list_products` |
| `projects` | `list_projects`, `get_project`, `add_project`, `update_project`, `delete_project`, notas, enlaces, categorías y tags |
| `notes` | Blog (`list_posts`, `get_post`, `add_post`, `update_post`, `delete_post`, enlaces), conceptos (`list_concepts`, `add_concept`, `update_concept`, `delete_concept`) y rachas (`list_streaks`, `add_streak`, `checkin_streak`, `delete_streak`) |
| `jobs` | `list_applications`, `add_application`, `update_application`, `delete_application`, `list_portals`, `add_portal`, `update_portal`, `delete_portal` |
| (todos) | `daily_overview`: saldo, tareas pendientes, próximos eventos, nutrición de hoy y rachas en una sola llamada |

Ejemplos de lo que le puedes decir:

- "Gasté 18 mil en almuerzo" → `add_transaction`
- "¿Cómo voy hoy?" → `daily_overview`
- "Agéndame dentista el viernes a las 3 pm con aviso el día antes" → `add_event`
- "Comí 200 g de arroz en el almuerzo" → `log_food`
- "Hice press banca 4x8 con 60 kg" → `start_workout` + `add_set`
- "Me postulé a Rappi como Backend por Computrabajo, ya me llamaron a entrevista" → `add_application`

## Seguridad

- El token vale como una contraseña de tu cuenta: no lo compartas ni lo subas a git.
- Se revoca desde Configuración y deja de funcionar al instante.
- Un token no puede crear ni revocar otros tokens.
- Cada usuario crea sus propios tokens y solo ve sus datos.
- Las herramientas `delete_*` están marcadas como irreversibles para que Claude te pida confirmación.

## Probarlo

`npx tsx --env-file=.env scripts/mcp-e2e.ts` (desde la raíz del repo) recorre todas las herramientas
contra la app desplegada con un usuario inventado y borra lo que crea.
