import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/cusmej/Downloads/FORMATO PARA LAS INTERFACES.xlsx";
const outputDir = path.resolve("entregables/interfaces_graficas_preview");
await fs.mkdir(outputDir, { recursive: true });

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,region,computedStyle,drawing",
  maxChars: 10000,
  tableMaxRows: 30,
  tableMaxCols: 12,
});
console.log(summary.ndjson);

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name" });
console.log(sheets.ndjson);

const firstSheet = JSON.parse(sheets.ndjson.trim().split("\n")[0]).name;
const preview = await workbook.render({
  sheetName: firstSheet,
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(path.join(outputDir, "template_preview.png"), new Uint8Array(await preview.arrayBuffer()));
console.log(path.join(outputDir, "template_preview.png"));
