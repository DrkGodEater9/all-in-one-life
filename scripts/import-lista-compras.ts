/**
 * Importa la lista de productos con precios (D1 y tienda de barrio).
 * Idempotente por nombre + tienda: si ya existe, actualiza precio y datos.
 *
 *   npx tsx scripts/import-lista-compras.ts scripts/data/lista-compras.json
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

type Row = [
  name: string,
  category: string,
  quantity: number | null,
  unit: string,
  priceCop: number,
  store: string,
  priceType: string,
  note: string | null,
  url: string | null,
  recipeCodes: string[],
];

const file = process.argv[2];
if (!file) {
  console.error("Uso: npx tsx scripts/import-lista-compras.ts <archivo.json>");
  process.exit(1);
}
const rows = (JSON.parse(readFileSync(file, "utf8")) as { lista_de_compras: { items: Row[] } })
  .lista_de_compras.items;

async function main() {
  const prisma = new PrismaClient();
  try {
    let created = 0;
    for (const [name, category, quantity, unit, priceCop, store, priceType, note, url, recipeCodes] of rows) {
      const data = { name, category, quantity, unit, priceCop, store, priceType, note, url, recipeCodes };
      const existing = await prisma.nutritionProduct.findFirst({ where: { name, store } });
      if (existing) await prisma.nutritionProduct.update({ where: { id: existing.id }, data });
      else {
        await prisma.nutritionProduct.create({ data });
        created += 1;
      }
    }
    console.log(`✓ Productos: ${created} nuevos, ${rows.length - created} actualizados`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
