from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUTPUT_DIR = Path("outputs/interfaces_graficas/placeholders")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SCREENS = [
    ("01", "Inicio de sesión", "Acceso seguro", ["Correo electrónico", "Contraseña visible u oculta", "Acceso por rol"]),
    ("02", "Registro de socio", "Creación de cuenta", ["Datos personales", "Cédula y correo", "Clave de acceso"]),
    ("03", "Recuperar contraseña", "Solicitud de código", ["Correo registrado", "Código por email", "Validación segura"]),
    ("04", "Restablecer contraseña", "Cambio de clave", ["Código recibido", "Nueva contraseña", "Confirmación"]),
    ("05", "Pantalla principal", "Resumen institucional", ["Saludo por rol", "Accesos rápidos", "Anuncios activos"]),
    ("06", "Crear anuncio", "Publicación institucional", ["Título y categoría", "Contenido", "Imagen opcional"]),
    ("07", "Editar anuncio", "Gestión de avisos", ["Actualizar contenido", "Activar o desactivar", "Eliminar con confirmación"]),
    ("08", "Biblioteca documental", "Gestión de PDF", ["Subir documentos", "Buscar por nombre", "Estado de indexación"]),
    ("09", "Previsualización de PDF", "Consulta documental", ["Abrir documento", "Revisar contenido", "Descargar archivo"]),
    ("10", "Asistente documental", "Consulta semántica", ["Pregunta del usuario", "Respuesta simple", "Fuentes consultadas"]),
    ("11", "Notificaciones", "Avisos recibidos", ["No leídas", "Detalle del aviso", "Marcar como leído"]),
    ("12", "Administración de usuarios", "Gestión del secretario", ["Listado de socios", "Roles y estado", "Acciones administrativas"]),
]


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


F_TITLE = font(25, True)
F_SUBTITLE = font(16)
F_SMALL = font(14)
F_BOLD = font(14, True)
F_HEADER = font(14, True)
F_BUTTON = font(14, True)


def rounded_rectangle(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap(text, max_chars):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def center_text(draw, xy, text, text_font, fill):
    x, y = xy
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text((x - (box[2] - box[0]) / 2, y), text, font=text_font, fill=fill)


def make_placeholder(number, title, subtitle, bullets):
    width, height = 380, 560
    img = Image.new("RGB", (width, height), "#F5F8F3")
    draw = ImageDraw.Draw(img)

    rounded_rectangle(draw, (64, 16, 316, 544), 32, "#101827")
    rounded_rectangle(draw, (78, 42, 302, 516), 20, "#FFFFFF")
    draw.ellipse((184, 23, 196, 35), fill="#263244")
    rounded_rectangle(draw, (78, 42, 302, 126), 20, "#2E7D32")
    draw.rectangle((78, 96, 302, 126), fill="#2E7D32")

    center_text(draw, (190, 70), "ASOCIACIÓN 10 DE MAYO", F_HEADER, "#FFFFFF")
    center_text(draw, (190, 97), f"Pantalla {number}", F_SMALL, "#DDEEDC")

    rounded_rectangle(draw, (96, 146, 284, 236), 14, "#F0F8EF", "#D7E4D6")
    title_lines = wrap(title, 20)
    start_y = 174 if len(title_lines) == 1 else 160
    for idx, line in enumerate(title_lines[:2]):
        center_text(draw, (190, start_y + idx * 27), line, F_TITLE, "#1F2937")
    center_text(draw, (190, 246), subtitle, F_SUBTITLE, "#6B7280")

    for idx, bullet in enumerate(bullets[:3]):
        y = 288 + idx * 58
        rounded_rectangle(draw, (104, y - 26, 276, y + 18), 12, "#FFFFFF", "#CFE0CF")
        draw.ellipse((116, y - 18, 136, y + 2), fill="#E6F4E8")
        center_text(draw, (126, y - 15), "✓", F_BOLD, "#2E7D32")
        draw.text((148, y - 13), bullet, font=F_BOLD, fill="#374151")

    rounded_rectangle(draw, (96, 450, 284, 486), 18, "#D1A922")
    center_text(draw, (190, 460), "Captura referencial", F_BUTTON, "#FFFFFF")
    center_text(draw, (190, 531), "Reemplazar por captura real", F_SMALL, "#6B7280")

    img.save(OUTPUT_DIR / f"{number}.png")


for screen in SCREENS:
    make_placeholder(*screen)

print(OUTPUT_DIR.resolve())
