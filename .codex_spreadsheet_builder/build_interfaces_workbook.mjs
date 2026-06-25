import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("../entregables/interfaces_graficas");
const outputPath = path.join(outputDir, "diseno_interfaces_graficas_app_movil.xlsx");
const previewDir = path.join(outputDir, "previews");

const project =
  "Aplicación móvil para la Asociación Agrícola 10 de Mayo con chatbot informativo documental basado en recuperación semántica.";
const developer = "Salas Cox y Cusme Montenegro";

const screens = [
  {
    sheet: "01 Login",
    title: "Inicio de sesión",
    description:
      "Permite al socio o secretario acceder al aplicativo móvil mediante correo electrónico y contraseña. La pantalla incluye validación de credenciales, opción para visualizar u ocultar la contraseña, acceso a recuperación de clave y navegación hacia el registro de usuario.",
  },
  {
    sheet: "02 Registro",
    title: "Registro de usuario socio",
    description:
      "Permite registrar un nuevo socio mediante el ingreso de datos personales como nombres, apellidos, cédula, correo electrónico y contraseña. La interfaz valida los campos obligatorios antes de enviar la solicitud al backend para la creación de la cuenta.",
  },
  {
    sheet: "03 Recuperar clave",
    title: "Recuperación de contraseña",
    description:
      "Permite solicitar la recuperación de contraseña mediante el correo electrónico registrado. El sistema envía la solicitud al backend y utiliza el servicio SMTP para remitir el enlace o token de restablecimiento al usuario correspondiente.",
  },
  {
    sheet: "04 Restablecer clave",
    title: "Restablecimiento de contraseña",
    description:
      "Permite ingresar una nueva contraseña a partir del token de recuperación recibido. La pantalla valida la longitud mínima de la clave, confirma el cambio y actualiza el acceso del usuario de forma segura.",
  },
  {
    sheet: "05 Cambio obligatorio",
    title: "Cambio obligatorio de contraseña",
    description:
      "Se muestra cuando el usuario ingresa con una clave temporal o cuando el sistema requiere actualizar la contraseña. Antes de continuar al menú principal, el usuario debe definir una nueva clave válida.",
  },
  {
    sheet: "06 Inicio",
    title: "Pantalla principal con anuncios",
    description:
      "Presenta el saludo del usuario autenticado, su rol dentro del sistema, accesos rápidos a los módulos principales y el listado de anuncios institucionales activos. Para el secretario, la interfaz habilita opciones de administración como creación de anuncios y gestión de usuarios.",
  },
  {
    sheet: "07 Asistente",
    title: "Chatbot informativo documental",
    description:
      "Permite realizar consultas en lenguaje natural sobre la información institucional cargada en el sistema. La pregunta se envía al backend, que consulta el microservicio semántico y devuelve una respuesta basada únicamente en fragmentos relevantes de documentos indexados.",
  },
  {
    sheet: "08 Documentos",
    title: "Biblioteca de documentos",
    description:
      "Muestra los documentos PDF institucionales cargados en el sistema junto con su estado de indexación. El secretario puede subir o eliminar archivos, mientras que los usuarios pueden visualizar o descargar documentos disponibles.",
  },
  {
    sheet: "09 Notificaciones",
    title: "Notificaciones",
    description:
      "Presenta los avisos generados a partir de anuncios institucionales y permite identificar cuáles se encuentran pendientes de lectura. El usuario puede revisar las notificaciones y marcarlas como leídas.",
  },
  {
    sheet: "10 Usuarios",
    title: "Administración de usuarios",
    description:
      "Permite al secretario consultar los usuarios registrados, revisar sus roles y realizar acciones administrativas relacionadas con la gestión de socios y secretarios dentro del aplicativo móvil.",
  },
  {
    sheet: "11 Anuncio",
    title: "Crear y editar anuncio",
    description:
      "Permite al secretario registrar o actualizar anuncios institucionales mediante título, categoría, contenido e imagen opcional. Al publicar un anuncio, el sistema genera notificaciones para los usuarios activos.",
  },
];

function setValues(sheet, range, values) {
  sheet.getRange(range).values = values;
}

function merge(sheet, range) {
  sheet.getRange(range).merge();
}

function formatRange(sheet, range, format) {
  sheet.getRange(range).format = format;
}

function buildSheet(sheet, screen) {
  sheet.showGridLines = false;

  sheet.getRange("A:A").format.columnWidth = 3;
  sheet.getRange("B:B").format.columnWidth = 52;
  sheet.getRange("C:C").format.columnWidth = 42;
  sheet.getRange("3:3").format.rowHeight = 30;
  sheet.getRange("4:4").format.rowHeight = 30;
  sheet.getRange("5:5").format.rowHeight = 34;
  sheet.getRange("6:6").format.rowHeight = 56;
  sheet.getRange("7:7").format.rowHeight = 34;
  sheet.getRange("8:8").format.rowHeight = 310;
  sheet.getRange("9:9").format.rowHeight = 118;

  ["B3:C3", "B4:C4", "B5:C5", "B7:C7", "B8:C8", "B9:C9"].forEach((range) => merge(sheet, range));

  setValues(sheet, "B3:C9", [
    ["Universidad de Guayaquil", null],
    ["Carrera Sistemas de Información", null],
    ["DISEÑO DE INTERFACES", null],
    [`Proyecto: ${project}`, `Desarrollador: ${developer}`],
    [`INTERFAZ DE ${screen.title.toUpperCase()}`, null],
    ["ESPACIO PARA CAPTURA DE PANTALLA DE LA APP MÓVIL", null],
    [`Descripción de pantalla: ${screen.description}`, null],
  ]);

  formatRange(sheet, "B3:C9", {
    font: { typeface: "Times New Roman", fontSize: 12, color: "#000000" },
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  });
  formatRange(sheet, "B3:C5", {
    font: { typeface: "Times New Roman", fontSize: 14, bold: true, color: "#000000" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  });
  formatRange(sheet, "B6:C6", {
    font: { typeface: "Times New Roman", fontSize: 12, color: "#000000" },
    horizontalAlignment: "left",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  });
  formatRange(sheet, "B7:C7", {
    font: { typeface: "Times New Roman", fontSize: 13, bold: true, color: "#000000" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  });
  formatRange(sheet, "B8:C8", {
    font: { typeface: "Times New Roman", fontSize: 12, italic: true, color: "#666666" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  });
  formatRange(sheet, "B9:C9", {
    font: { typeface: "Times New Roman", fontSize: 12, color: "#000000" },
    horizontalAlignment: "left",
    verticalAlignment: "top",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  });
}

const workbook = Workbook.create();

for (const screen of screens) {
  const sheet = workbook.worksheets.add(screen.sheet);
  buildSheet(sheet, screen);
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const previewSheets = [screens[0].sheet, screens[6].sheet, screens[10].sheet];
for (const sheetName of previewSheets) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(previewDir, `${sheetName.replaceAll(" ", "_")}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
