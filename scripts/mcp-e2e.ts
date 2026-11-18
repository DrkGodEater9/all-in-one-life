/* eslint-disable @typescript-eslint/no-explicit-any -- script de prueba: las respuestas de la API son JSON arbitrario */
/**
 * Prueba de punta a punta del servidor MCP contra la app desplegada.
 *
 * Crea un token para un usuario INVENTADO ("mcp-test-user"), recorre todas las
 * herramientas (crear, leer, modificar, borrar) y al terminar borra todo lo que
 * dejó. No toca los datos de ningún usuario real.
 *
 *   npx tsx --env-file=.env scripts/mcp-e2e.ts
 *
 * Requiere haber corrido `npm install` dentro de mcp-server/ y que el deploy
 * apunte a la misma base que DATABASE_URL.
 */
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { prismaAdmin as db } from "../lib/db";
import { Client } from "../mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";

const DL = mkdtempSync(path.join(tmpdir(), "mcp-e2e-"));
const U = "mcp-test-user"; // usuario inventado: no toca datos reales
const URL = "https://all-in-one-life.vercel.app";
let fails = 0, passes = 0;
const ok = (c: boolean, m: string) => { if (c) passes++; else { fails++; console.log("FAIL", m); } };

async function cleanup() {
  await db.financeDebtPayment.deleteMany({ where: { debt: { source: { userId: U } } } });
  await db.financeDebt.deleteMany({ where: { source: { userId: U } } });
  await db.financeTransaction.deleteMany({ where: { source: { userId: U } } });
  await db.financeCreditMovement.deleteMany({ where: { creditLine: { userId: U } } });
  await db.streakCheckin.deleteMany({ where: { streak: { userId: U } } });
  await db.nutritionMealItem.deleteMany({ where: { mealLog: { userId: U } } });
  await db.nutritionRecipeItem.deleteMany({ where: { recipe: { userId: U } } });
  await db.gymWorkoutSet.deleteMany({ where: { workout: { routine: { userId: U } } } });
  await db.gymWorkout.deleteMany({ where: { routine: { userId: U } } });
  await db.gymRoutineExercise.deleteMany({ where: { routine: { userId: U } } });
  await db.calendarReminder.deleteMany({ where: { event: { userId: U } } });
  await db.taskLabelAssignment.deleteMany({ where: { task: { userId: U } } });
  await db.projectTagAssignment.deleteMany({ where: { project: { userId: U } } });
  await db.projectNote.deleteMany({ where: { project: { userId: U } } });
  await db.projectLink.deleteMany({ where: { project: { userId: U } } });
  await db.blogLink.deleteMany({ where: { post: { userId: U } } });
  const roots = ["financeSource","financeAsset","financeCreditLine","streak","nutritionFavorite","nutritionMealLog","nutritionRecipe","nutritionGoal","nutritionWeightLog","nutritionWaterLog","nutritionProduct","gymRoutine","gymMeasurement","calendarEvent","taskLabel","task","projectCategory","project","projectTag","blogPost","concept","jobPortal","jobApplication","recurrenceRule","apiToken"] as const;
  for (const m of roots) await (db[m] as any).deleteMany({ where: { userId: U } });
}

(async () => {
  await cleanup();
  const token = "pos_" + crypto.randomBytes(32).toString("base64url");
  await db.apiToken.create({ data: { userId: U, name: "mcp-test", tokenHash: crypto.createHash("sha256").update(token).digest("hex") } });
  const transport = new StdioClientTransport({ command: "node", args: ["mcp-server/index.mjs"], env: { ...process.env, POS_URL: URL, POS_TOKEN: token, POS_DOWNLOAD_DIR: DL } as Record<string, string> });
  const client = new Client({ name: "e2e", version: "1" });
  await client.connect(transport);

  // t(): llama una herramienta; devuelve JSON o { __err }
  const t = async (name: string, args: Record<string, unknown> = {}): Promise<any> => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] };
    const text = res.content[0].text;
    if (res.isError) { console.log("   (error en " + name + "): " + text.slice(0, 200)); return { __err: text }; }
    try { return JSON.parse(text); } catch { return text; }
  };
  const good = (r: any, m: string) => ok(r && !r.__err, m);
  const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

  try {
    const tools = (await client.listTools()).tools.map((x) => x.name);
    ok(tools.length >= 110, "herramientas: " + tools.length);

    // ── Empleo ──
    let r = await t("add_application", { company: "ZZ", position: "Dev" }); good(r, "add_application");
    good(await t("update_application", { id: r.id, status: "entrevista" }), "update_application");
    ok((await t("list_applications", { status: "entrevista" })).length === 1, "list_applications");
    good(await t("delete_application", { id: r.id }), "delete_application");
    r = await t("add_portal", { name: "ZZPortal" }); good(r, "add_portal");
    good(await t("update_portal", { id: r.id, status: "perfil_completo" }), "update_portal");
    ok((await t("list_portals")).length === 1, "list_portals");
    good(await t("delete_portal", { id: r.id }), "delete_portal");

    // ── Tareas ──
    const task = await t("add_task", { title: "ZZ tarea", quadrant: "do", date: TODAY, labelNames: ["zz-etq"] });
    good(task, "add_task"); ok(task.urgent === true && task.important === true, "add_task cuadrante do => urgente+importante");
    ok((await t("list_tasks", { quadrant: "do" })).length === 1, "list_tasks filtro cuadrante");
    ok((await t("list_tasks", { label: "zz-etq" })).length === 1, "list_tasks filtro etiqueta");
    const upd = await t("update_task", { id: task.id, date: null, description: "d" }); good(upd, "update_task date null");
    ok(upd.date === null, "update_task limpia la fecha");
    good(await t("set_task_status", { id: task.id, status: "done" }), "set_task_status");
    const labels = await t("list_task_labels"); ok(labels.some((l: any) => l.name === "zz-etq"), "list_task_labels");
    const lab = await t("add_task_label", { name: "zz-otra", color: "#ff0000" }); good(lab, "add_task_label");
    good(await t("delete_task_label", { id: lab.id }), "delete_task_label");
    good(await t("delete_task", { id: task.id }), "delete_task");
    const mtask = await t("add_task", { title: "ZZ matriz", quadrant: "schedule", date: TODAY });
    const mx = await t("task_matrix"); ok(Array.isArray(mx.schedule) && mx.schedule.some((x: any) => x.id === mtask.id), "task_matrix agrupa por cuadrante");
    ok((await t("list_task_days", { from: TODAY, to: TODAY })).some((x: any) => x.id === mtask.id), "list_task_days");
    await t("delete_task", { id: mtask.id });

    // ── Calendario ──
    const ev = await t("add_event", { title: "ZZ evento", date: TODAY, time: "15:30", category: "work", location: "Oficina", reminders: [{ remindType: "same_day", remindTime: "08:00" }] });
    good(ev, "add_event"); const evId = ev.event.id; ok(ev.occurrences === 1, "add_event 1 ocurrencia");
    ok((await t("list_events", { from: TODAY, to: TODAY })).some((e: any) => e.id === evId), "list_events");
    ok(JSON.stringify(await t("get_calendar_day", { date: TODAY })).includes("ZZ evento"), "get_calendar_day");
    const eu = await t("update_event", { id: evId, location: "Casa" }); good(eu, "update_event parcial");
    ok(eu.location === "Casa" && eu.title === "ZZ evento" && String(eu.time).includes("15:30"), "update_event conserva el resto");
    const rem = await t("add_event_reminder", { eventId: evId, remindType: "day_before", remindTime: "09:00" }); good(rem, "add_event_reminder");
    good(await t("delete_event_reminder", { id: rem.id }), "delete_event_reminder");
    good(await t("delete_event", { id: evId }), "delete_event");
    const rec = await t("add_event", { title: "ZZ serie", date: TODAY, time: "10:00", category: "personal", recurrence: { frequency: "daily", intervalN: 1, endsOn: TODAY.slice(0, 8) + "28" } }); good(rec, "add_event recurrente"); ok(rec.occurrences > 1, "serie genera varias ocurrencias: " + rec.occurrences);
    const first = (await t("list_events", { from: TODAY })).find((e: any) => e.title === "ZZ serie");
    good(await t("delete_event", { id: first.id, deleteRecurrence: "all" }), "delete_event serie completa");
    ok(!(await t("list_events", {})).some((e: any) => e.title === "ZZ serie"), "la serie quedó borrada");

    // ── Finanzas ──
    const b0 = await t("get_balance"); good(b0, "get_balance");
    const tx = await t("add_transaction", { type: "expense", amount: 5000, category: "otro", source: "daily", notes: "zz" }); good(tx, "add_transaction");
    ok((await t("get_balance")).daily === b0.daily - 5000, "saldo baja 5000");
    ok((await t("list_transactions", { source: "daily", type: "expense" })).length === 1, "list_transactions");
    good(await t("monthly_summary", {}), "monthly_summary");
    good(await t("delete_transaction", { id: tx.id }), "delete_transaction");
    ok((await t("get_balance")).daily === b0.daily, "saldo restaurado");
    await t("add_transaction", { type: "income", amount: 20000, category: "otro", source: "savings" });
    const debt = await t("add_debt", { direction: "they_owe_me", person: "Pedro", reason: "almuerzo", amount: 10000, source: "daily" }); good(debt, "add_debt");
    good(await t("pay_debt", { id: debt.id, amount: 4000 }), "pay_debt");
    ok((await t("list_debt_payments", { id: debt.id })).length === 1, "list_debt_payments");
    ok((await t("list_debts", { direction: "they_owe_me" })).length === 1, "list_debts");
    ok((await t("pay_debt", { id: debt.id, amount: 999999 })).__err !== undefined, "pay_debt rechaza exceso");
    const asset = await t("add_asset", { title: "ZZ lap", quantity: 1, priceEach: 100 }); good(asset, "add_asset");
    good(await t("update_asset", { id: asset.id, title: "ZZ lap2", quantity: 2 }), "update_asset");
    ok((await t("list_assets")).length === 1, "list_assets");
    good(await t("delete_asset", { id: asset.id }), "delete_asset");
    const cl = await t("add_credit_line", { name: "ZZ banco", creditLimit: 100000, totalDebt: 50000 }); good(cl, "add_credit_line");
    const mv = await t("add_credit_movement", { creditLineId: cl.id, type: "withdrawal", amount: 30000 }); good(mv, "add_credit_movement");
    good(await t("get_credit_line", { id: cl.id }), "get_credit_line");
    good(await t("update_credit_line", { id: cl.id, name: "ZZ banco 2" }), "update_credit_line");
    ok((await t("list_credit_lines")).length === 1, "list_credit_lines");
    const dl = await t("export_credit_line_xlsx", { id: cl.id }); good(dl, "export_credit_line_xlsx");
    ok(dl.bytes > 1000 && readFileSync(dl.savedTo).subarray(0, 2).toString() === "PK", "el Excel del crédito es un .xlsx válido (zip)");
    const dx = await t("export_transactions_xlsx", { source: "savings" }); good(dx, "export_transactions_xlsx");
    ok(dx.bytes > 1000 && readFileSync(dx.savedTo).subarray(0, 2).toString() === "PK", "el Excel de transacciones es un .xlsx válido (zip)");
    good(await t("delete_credit_movement", { creditLineId: cl.id, movementId: mv.id }), "delete_credit_movement");
    good(await t("delete_credit_line", { id: cl.id }), "delete_credit_line");

    // ── Gym ──
    const rt = await t("add_routine", { name: "ZZ push", exercises: [{ name: "Press banca", type: "weight" }] }); good(rt, "add_routine");
    good(await t("update_routine", { id: rt.id, name: "ZZ push 2", exercises: [{ name: "Press banca", type: "weight" }, { name: "Fondos", type: "bodyweight" }] }), "update_routine");
    ok((await t("list_routines")).length === 1, "list_routines");
    const wo = await t("start_workout", { routineId: rt.id }); good(wo, "start_workout");
    const set = await t("add_set", { workoutId: wo.id, exerciseName: "Press banca", exerciseType: "weight", reps: 8, weightKg: 60 }); good(set, "add_set");
    const wd = await t("get_workout", { id: wo.id }); ok(JSON.stringify(wd).includes("Press banca"), "get_workout");
    good(await t("finish_workout", { id: wo.id }), "finish_workout");
    ok((await t("list_workouts", { routineId: rt.id })).length === 1, "list_workouts");
    good(await t("list_exercises"), "list_exercises");
    good(await t("exercise_history", { name: "Press banca" }), "exercise_history");
    good(await t("exercise_record", { name: "Press banca" }), "exercise_record");
    good(await t("gym_streak"), "gym_streak");
    good(await t("add_measurement", { waistCm: 80 }), "add_measurement");
    ok((await t("list_measurements")).length === 1, "list_measurements");
    const delSet = await t("delete_set", { workoutId: wo.id, setId: set.id ?? set.set?.id }); good(delSet, "delete_set");
    good(await t("delete_routine", { id: rt.id }), "delete_routine");

    // ── Nutrición ──
    good(await t("set_nutrition_goals", { kcal: 2000, proteinG: 120, carbsG: 200, fatG: 60 }), "set_nutrition_goals");
    ok((await t("get_nutrition_goals")).kcal === 2000, "get_nutrition_goals");
    const fav = await t("add_favorite", { name: "ZZ arroz", kcal100g: 130, protein100g: 2.7, carbs100g: 28, fat100g: 0.3 }); good(fav, "add_favorite");
    ok((await t("list_favorites")).length === 1, "list_favorites");
    const item = await t("log_food", { mealType: "lunch", amountG: 200, favoriteId: fav.id }); good(item, "log_food favorito");
    const item2 = await t("log_food", { mealType: "snack", amountG: 100, foodName: "ZZ manzana", kcal100g: 52, protein100g: 0.3, carbs100g: 14, fat100g: 0.2 }); good(item2, "log_food manual");
    const log = await t("nutrition_log"); ok(JSON.stringify(log).includes("ZZ arroz"), "nutrition_log");
    const sum = await t("nutrition_summary"); good(sum, "nutrition_summary");
    ok(JSON.stringify(sum).includes("312") || JSON.stringify(sum).includes("260"), "summary suma calorías (260 arroz + 52 manzana)");
    good(await t("delete_log_item", { id: item.id }), "delete_log_item");
    const recipe = await t("create_recipe", { name: "ZZ receta", mealType: "lunch", servings: 2, items: [{ foodName: "ZZ pollo", amountG: 150, kcal100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6 }], steps: [{ text: "cocinar", minutes: 10 }] }); good(recipe, "create_recipe");
    ok((await t("list_recipes")).some((x: any) => x.id === recipe.id), "list_recipes");
    good(await t("log_recipe", { recipeId: recipe.id, mealType: "dinner", servings: 1 }), "log_recipe");
    const ur = await t("update_recipe", { id: recipe.id, name: "ZZ receta v2", tips: ["sal"] }); good(ur, "update_recipe parcial");
    ok(ur.name === "ZZ receta v2" && ur.items.length === 1 && ur.items[0].foodName === "ZZ pollo", "update_recipe conserva ingredientes");
    ok(Math.abs(ur.items[0].kcal - 247.5) < 0.6 && ur.servings === 2 && ur.steps.length === 1, "update_recipe conserva macros, porciones y pasos");
    const ur2 = await t("update_recipe", { id: recipe.id, items: [{ foodName: "ZZ huevo", amountG: 100, kcal100g: 155, protein100g: 13, carbs100g: 1, fat100g: 11 }] });
    ok(ur2.items.length === 1 && ur2.items[0].foodName === "ZZ huevo", "update_recipe reemplaza ingredientes si se envían");
    ok((await t("update_recipe", { id: 999999, name: "x" })).__err !== undefined, "update_recipe id inexistente da error");
    good(await t("add_water", { amountMl: 500 }), "add_water");
    ok(JSON.stringify(await t("get_water")).includes("500"), "get_water");
    good(await t("add_weight", { weightKg: 70.5 }), "add_weight");
    ok((await t("list_weight", { days: 7 })).length >= 1, "list_weight");
    good(await t("search_food", { q: "arroz" }), "search_food");
    good(await t("list_products"), "list_products");
    good(await t("nutrition_history", { days: 7 }), "nutrition_history");
    good(await t("nutrition_streak"), "nutrition_streak");
    good(await t("delete_recipe", { id: recipe.id }), "delete_recipe");
    good(await t("delete_favorite", { id: fav.id }), "delete_favorite");

    // ── Proyectos ──
    const cat = await t("add_project_category", { name: "ZZ cat" }); good(cat, "add_project_category");
    good(await t("add_project_tag", { name: "zz-tag" }), "add_project_tag");
    ok((await t("list_project_categories")).length === 1 && (await t("list_project_tags")).length === 1, "list categorías/tags");
    const pj = await t("add_project", { title: "ZZ proyecto", categoryId: cat.id, tagNames: ["zz-tag"] }); good(pj, "add_project");
    ok((await t("update_project", { id: pj.id, status: "en_progreso" })).status === "en_progreso", "update_project status");
    const note = await t("add_project_note", { projectId: pj.id, content: "nota" }); good(note, "add_project_note");
    const link = await t("add_project_link", { projectId: pj.id, url: "https://example.com", title: "ej" }); good(link, "add_project_link");
    const pd = await t("get_project", { id: pj.id }); ok(pd.notes?.length === 1 && pd.links?.length === 1, "get_project con nota y enlace");
    ok((await t("list_projects", { status: "en_progreso", tag: "zz-tag" })).length === 1, "list_projects filtros");
    good(await t("delete_project_note", { projectId: pj.id, noteId: note.id }), "delete_project_note");
    good(await t("delete_project_link", { projectId: pj.id, linkId: link.id }), "delete_project_link");
    good(await t("delete_project", { id: pj.id }), "delete_project");

    // ── Blog / conceptos / rachas ──
    const post = await t("add_post", { title: "ZZ post", content: "texto largo", tags: ["a"] }); good(post, "add_post");
    good(await t("update_post", { id: post.id, pinned: true }), "update_post");
    const pl = await t("add_post_link", { postId: post.id, url: "https://example.com" }); good(pl, "add_post_link");
    ok((await t("get_post", { id: post.id })).links?.length === 1, "get_post");
    ok((await t("list_posts", { q: "ZZ" })).length === 1, "list_posts");
    good(await t("delete_post_link", { postId: post.id, linkId: pl.id }), "delete_post_link");
    good(await t("delete_post", { id: post.id }), "delete_post");
    const con = await t("add_concept", { term: "ZZ concepto", definition: "def", topic: "t" }); good(con, "add_concept");
    good(await t("update_concept", { id: con.id, definition: "def2" }), "update_concept");
    ok((await t("list_concepts", { q: "ZZ" })).length === 1, "list_concepts");
    good(await t("delete_concept", { id: con.id }), "delete_concept");
    const st = await t("add_streak", { name: "ZZ hábito", mode: "daily" }); good(st, "add_streak");
    good(await t("checkin_streak", { id: st.id, done: true }), "checkin_streak");
    const ls = await t("list_streaks"); ok(JSON.stringify(ls).includes("ZZ hábito"), "list_streaks");
    good(await t("delete_streak", { id: st.id }), "delete_streak");

    // ── Resumen ──
    const ov = await t("daily_overview"); good(ov, "daily_overview"); ok(ov.balance && ov.date === TODAY, "daily_overview trae balance y fecha");

    // ── Aislamiento: el usuario real no ve nada de lo del usuario de prueba ──
    await t("add_task", { title: "ZZ aislamiento" });
    const real = await db.task.count({ where: { userId: "15f28e8b-1c38-4ed9-9ba0-81002eddc197", title: "ZZ aislamiento" } });
    ok(real === 0, "el usuario real no recibe datos del usuario de prueba");
    await client.close();
  } catch (e) {
    console.error("ERROR:", e); fails++;
  } finally {
    await cleanup();
    rmSync(DL, { recursive: true, force: true });
    const left = (await db.task.count({ where: { userId: U } })) + (await db.apiToken.count({ where: { userId: U } })) + (await db.financeSource.count({ where: { userId: U } }));
    console.log(`\nPASARON ${passes} | FALLARON ${fails} | filas de prueba sobrantes: ${left}`);
    await db.$disconnect();
    process.exit(fails ? 1 : 0);
  }
})();
