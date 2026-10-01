/**
 * Generador de reportes Excel (.xlsx) con formato para todas las
 * exportaciones de Finanzas. No es una route (el nombre no es `route.ts`).
 */
import ExcelJS from "exceljs";

const COLORS = {
  title: "FF1F2937",
  header: "FF1F2937",
  headerText: "FFFFFFFF",
  zebra: "FFF3F4F6",
  border: "FFD1D5DB",
  muted: "FF6B7280",
  positive: "FF15803D",
  negative: "FFB91C1C",
  totalBg: "FFE5E7EB",
};

export const MONEY_FORMAT = '"$" #,##0.00;[Red]-"$" #,##0.00';
const DATE_FORMAT = "dd/mm/yyyy";

export interface XlsxColumn {
  header: string;
  key: string;
  width: number;
  kind?: "text" | "money" | "date";
  align?: "left" | "center" | "right";
}

export interface XlsxSummaryItem {
  label: string;
  value: number | string;
  kind?: "money" | "text";
  tone?: "positive" | "negative";
}

export interface XlsxReport {
  sheetName: string;
  title: string;
  subtitle?: string;
  summary?: XlsxSummaryItem[];
  columns: XlsxColumn[];
  rows: Record<string, string | number | Date | null>[];
  /** Pinta el monto de cada fila en verde/rojo según esta función. */
  rowTone?: (row: Record<string, string | number | Date | null>) => "positive" | "negative" | undefined;
  /** Columnas `money` para las que se agrega una fila de total. */
  totals?: { label: string; keys: string[] };
  emptyMessage?: string;
}

const thin = { style: "thin" as const, color: { argb: COLORS.border } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

export async function buildXlsx(report: XlsxReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "All in One Life";
  wb.created = new Date();
  const ws = wb.addWorksheet(report.sheetName, {
    views: [{ showGridLines: false }],
  });

  const cols = report.columns;
  ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = cols.length;

  // ── Título ──
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = report.title;
  title.font = { size: 18, bold: true, color: { argb: COLORS.title } };
  title.alignment = { vertical: "middle" };
  ws.getRow(1).height = 30;

  let rowIdx = 2;
  if (report.subtitle) {
    ws.mergeCells(rowIdx, 1, rowIdx, lastCol);
    const sub = ws.getCell(rowIdx, 1);
    sub.value = report.subtitle;
    sub.font = { size: 10, italic: true, color: { argb: COLORS.muted } };
    rowIdx++;
  }
  rowIdx++; // línea en blanco

  // ── Resumen (etiqueta / valor) ──
  if (report.summary?.length) {
    for (const item of report.summary) {
      const label = ws.getCell(rowIdx, 1);
      label.value = item.label;
      label.font = { bold: true, color: { argb: COLORS.muted } };
      const value = ws.getCell(rowIdx, 2);
      value.value = item.value;
      value.alignment = { horizontal: "right" };
      value.font = {
        bold: true,
        color: item.tone
          ? { argb: item.tone === "positive" ? COLORS.positive : COLORS.negative }
          : undefined,
      };
      if (item.kind === "money") value.numFmt = MONEY_FORMAT;
      rowIdx++;
    }
    rowIdx++;
  }

  // ── Encabezado de la tabla ──
  const headerRowIdx = rowIdx;
  const headerRow = ws.getRow(headerRowIdx);
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.header } };
    cell.alignment = {
      vertical: "middle",
      horizontal: c.kind === "money" ? "right" : c.align ?? "left",
    };
    cell.border = border;
  });
  headerRow.height = 22;
  rowIdx++;

  // ── Filas ──
  if (report.rows.length === 0) {
    ws.mergeCells(rowIdx, 1, rowIdx, lastCol);
    const empty = ws.getCell(rowIdx, 1);
    empty.value = report.emptyMessage ?? "Sin registros para mostrar.";
    empty.font = { italic: true, color: { argb: COLORS.muted } };
    empty.alignment = { horizontal: "center" };
    rowIdx++;
  }

  const firstDataRow = rowIdx;
  report.rows.forEach((data, n) => {
    const row = ws.getRow(rowIdx);
    const tone = report.rowTone?.(data);
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = data[c.key] ?? null;
      cell.border = border;
      cell.alignment = {
        vertical: "top",
        horizontal: c.kind === "money" ? "right" : c.align ?? "left",
        wrapText: c.kind === undefined || c.kind === "text",
      };
      if (c.kind === "money") {
        cell.numFmt = MONEY_FORMAT;
        if (tone) {
          cell.font = { color: { argb: tone === "positive" ? COLORS.positive : COLORS.negative } };
        }
      } else if (c.kind === "date") {
        cell.numFmt = DATE_FORMAT;
        cell.alignment = { vertical: "top", horizontal: c.align ?? "center" };
      }
      if (n % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebra } };
      }
    });
    rowIdx++;
  });
  const lastDataRow = rowIdx - 1;

  // ── Totales ──
  if (report.totals && report.rows.length > 0) {
    const row = ws.getRow(rowIdx);
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.border = border;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalBg } };
      cell.font = { bold: true };
      if (i === 0) cell.value = report.totals!.label;
      if (report.totals!.keys.includes(c.key)) {
        const letter = ws.getColumn(i + 1).letter;
        cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
        cell.numFmt = MONEY_FORMAT;
        cell.alignment = { horizontal: "right" };
      }
    });
    rowIdx++;
  }

  // ── Filtros y fila fija ──
  if (report.rows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRowIdx, column: 1 },
      to: { row: lastDataRow, column: lastCol },
    };
  }
  ws.views = [
    { showGridLines: false, state: "frozen", ySplit: headerRowIdx, xSplit: 0 },
  ];
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function xlsxResponse(report: XlsxReport, filename: string): Promise<Response> {
  const buffer = await buildXlsx(report);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
