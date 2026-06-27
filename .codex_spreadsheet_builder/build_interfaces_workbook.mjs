import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/interfaces_graficas");
const previewDir = path.join(outputDir, "previews");
const outputPath = path.join(outputDir, "diseno_interfaces_graficas_app_movil.xlsx");
const elaborationDate = "27/06/2026";

const project =
  "Chatbot informativo documental basado en recuperación semántica para la Asociación Agrícola 10 de Mayo del cantón Daule.";
const developers = "Alan Ricardo Salas Cox y José Carlos Cusme Montenegro";

const screens = [
  {
    sheet: "01 Login",
    title: "Inicio de sesión",
    subtitle: "Acceso seguro",
    bullets: ["Correo electrónico", "Contraseña visible u oculta", "Acceso por rol"],
    description:
      "Permite al socio o secretario acceder al aplicativo móvil mediante correo electrónico y contraseña. La pantalla valida las credenciales, permite visualizar u ocultar la contraseña y ofrece accesos para registro y recuperación de clave.",
  },
  {
    sheet: "02 Registro",
    title: "Registro de socio",
    subtitle: "Creación de cuenta",
    bullets: ["Datos personales", "Cédula y correo", "Clave de acceso"],
    description:
      "Permite registrar un nuevo socio mediante el ingreso de nombres, apellidos, cédula, correo electrónico y contraseña. La interfaz valida los campos obligatorios antes de enviar la solicitud al backend para crear la cuenta.",
  },
  {
    sheet: "03 Recuperar clave",
    title: "Recuperar contraseña",
    subtitle: "Solicitud de código",
    bullets: ["Correo registrado", "Código por email", "Validación segura"],
    description:
      "Permite solicitar un código de restablecimiento a partir del correo registrado. El sistema envía la solicitud al backend, que utiliza el servicio SMTP configurado para remitir el código de recuperación al usuario.",
  },
  {
    sheet: "04 Restablecer clave",
    title: "Restablecer contraseña",
    subtitle: "Cambio de clave",
    bullets: ["Código recibido", "Nueva contraseña", "Confirmación"],
    description:
      "Permite ingresar el código recibido por correo, definir una nueva contraseña y confirmar que ambas contraseñas coincidan. La pantalla reduce errores de escritura y actualiza el acceso del usuario de forma segura.",
  },
  {
    sheet: "05 Inicio",
    title: "Pantalla principal",
    subtitle: "Resumen institucional",
    bullets: ["Saludo por rol", "Accesos rápidos", "Anuncios activos"],
    description:
      "Presenta el saludo del usuario autenticado, su rol dentro del sistema, accesos rápidos a los módulos principales y el listado de anuncios institucionales activos. Para el secretario se habilitan acciones administrativas.",
  },
  {
    sheet: "06 Crear anuncio",
    title: "Crear anuncio",
    subtitle: "Publicación institucional",
    bullets: ["Título y categoría", "Contenido", "Imagen opcional"],
    description:
      "Permite al secretario registrar anuncios institucionales con título, categoría, contenido e imagen opcional. Al guardar el anuncio, el sistema publica el aviso y genera notificaciones para los usuarios activos.",
  },
  {
    sheet: "07 Editar anuncio",
    title: "Editar anuncio",
    subtitle: "Gestión de avisos",
    bullets: ["Actualizar contenido", "Activar o desactivar", "Eliminar con confirmación"],
    description:
      "Permite actualizar anuncios existentes, reemplazar o quitar la imagen asociada, activar o desactivar la publicación y eliminar el registro cuando corresponda. Las acciones críticas se solicitan con confirmación visual.",
  },
  {
    sheet: "08 Biblioteca",
    title: "Biblioteca documental",
    subtitle: "Gestión de PDF",
    bullets: ["Subir documentos", "Buscar por nombre", "Estado de indexación"],
    description:
      "Muestra los documentos PDF institucionales cargados en el sistema, permite buscarlos por nombre y revisar su estado de indexación. El secretario puede subir o eliminar documentos, y los usuarios pueden visualizar o descargar archivos disponibles.",
  },
  {
    sheet: "09 Vista PDF",
    title: "Previsualización de PDF",
    subtitle: "Consulta documental",
    bullets: ["Abrir documento", "Revisar contenido", "Descargar archivo"],
    description:
      "Permite abrir un documento de la biblioteca para revisar su contenido antes de descargarlo. Esta interfaz facilita que el socio consulte documentos institucionales sin depender de procesos manuales.",
  },
  {
    sheet: "10 Asistente",
    title: "Asistente documental",
    subtitle: "Consulta semántica",
    bullets: ["Pregunta del usuario", "Respuesta simple", "Fuentes consultadas"],
    description:
      "Permite realizar preguntas sobre los documentos institucionales indexados. La consulta se envía al backend, que recupera fragmentos relevantes mediante búsqueda semántica y devuelve una respuesta clara basada únicamente en documentos cargados.",
  },
  {
    sheet: "11 Notificaciones",
    title: "Notificaciones",
    subtitle: "Avisos recibidos",
    bullets: ["No leídas", "Detalle del aviso", "Marcar como leído"],
    description:
      "Presenta los avisos generados a partir de anuncios institucionales y permite identificar cuáles se encuentran pendientes de lectura. El usuario puede revisar cada notificación y marcarla como leída.",
  },
  {
    sheet: "12 Usuarios",
    title: "Administración de usuarios",
    subtitle: "Gestión del secretario",
    bullets: ["Listado de socios", "Roles y estado", "Acciones administrativas"],
    description:
      "Permite al secretario consultar los usuarios registrados, revisar sus roles y ejecutar acciones administrativas relacionadas con la gestión de socios y personal autorizado dentro del aplicativo móvil.",
  },
];

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function merge(sheet, range) {
  sheet.getRange(range).merge();
}

function setSheetSize(sheet) {
  sheet.showGridLines = false;
  sheet.getRange("A:A").format.columnWidth = 3;
  sheet.getRange("B:B").format.columnWidth = 58;
  sheet.getRange("C:C").format.columnWidth = 58;
  sheet.getRange("3:3").format.rowHeight = 26;
  sheet.getRange("4:4").format.rowHeight = 26;
  sheet.getRange("5:5").format.rowHeight = 30;
  sheet.getRange("6:6").format.rowHeight = 74;
  sheet.getRange("7:7").format.rowHeight = 34;
  sheet.getRange("8:8").format.rowHeight = 360;
  sheet.getRange("9:9").format.rowHeight = 120;
}

function applyTemplateStyle(sheet) {
  const all = sheet.getRange("B3:C9");
  all.format = {
    font: { typeface: "Times New Roman", fontSize: 12, color: "#000000" },
    wrapText: true,
    verticalAlignment: "middle",
    borders: { preset: "all", style: "thin", color: "#000000" },
  };

  sheet.getRange("B3:C4").format = {
    font: { typeface: "Times New Roman", fontSize: 14, bold: true, color: "#000000" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
  sheet.getRange("B5:C5").format = {
    font: { typeface: "Times New Roman", fontSize: 14, bold: true, color: "#000000" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
  sheet.getRange("B6:C6").format = {
    font: { typeface: "Times New Roman", fontSize: 12, color: "#000000" },
    horizontalAlignment: "left",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
  sheet.getRange("B7:C7").format = {
    font: { typeface: "Times New Roman", fontSize: 13, bold: true, color: "#000000" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
  sheet.getRange("B8:C8").format = {
    fill: "#FFFFFF",
    font: { typeface: "Times New Roman", fontSize: 12, italic: true, color: "#666666" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
  sheet.getRange("B9:C9").format = {
    font: { typeface: "Times New Roman", fontSize: 12, color: "#000000" },
    horizontalAlignment: "left",
    verticalAlignment: "top",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
}

async function buildSheet(workbook, screen, index, total) {
  const sheet = workbook.worksheets.add(screen.sheet);
  setSheetSize(sheet);

  ["B3:C3", "B4:C4", "B5:C5", "B7:C7", "B8:C8", "B9:C9"].forEach((range) => merge(sheet, range));

  sheet.getRange("B3:C9").values = [
    ["Universidad de Guayaquil", null],
    ["Carrera Sistemas de Información", null],
    ["DISEÑO DE INTERFACES", null],
    [`Proyecto: ${project}`, `Desarrolladores: ${developers}\nFecha de elaboración: ${elaborationDate}\nPágina ${index} de ${total}`],
    [`INTERFAZ DE ${screen.title.toUpperCase()}`, null],
    [`CAPTURA REFERENCIAL DE PANTALLA\n${screen.title}\nReemplazar por captura real del aplicativo móvil`, null],
    [`Descripción Pantalla de ${screen.title}: ${screen.description}`, null],
  ];

  applyTemplateStyle(sheet);

  const png = await fs.readFile(path.join(outputDir, "placeholders", `${String(index).padStart(2, "0")}.png`));
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  sheet.images.add({
    dataUrl,
    anchor: {
      from: { row: 7, col: 1, rowOffsetPx: 12, colOffsetPx: 178 },
      extent: { widthPx: 260, heightPx: 345 },
    },
  });
}

const workbook = Workbook.create();

for (let i = 0; i < screens.length; i += 1) {
  await buildSheet(workbook, screens[i], i + 1, screens.length);
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

for (const screen of screens) {
  const preview = await workbook.render({
    sheetName: screen.sheet,
    range: "A1:C10",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(previewDir, `${screen.sheet.replaceAll(" ", "_")}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const scan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(scan.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
process.exitCode = 0;
