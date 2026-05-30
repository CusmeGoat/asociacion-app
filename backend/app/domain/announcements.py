PRODUCT_CATEGORIES = ["PRODUCTO", "INSUMO"]
INSTITUTIONAL_CATEGORIES = [
    "SUBSIDIO",
    "CONVOCATORIA",
    "PROGRAMA",
    "NORMATIVA",
    "NOTICIA",
    "OTROS",
]
ALL_CATEGORIES = PRODUCT_CATEGORIES + INSTITUTIONAL_CATEGORIES

ANNOUNCEMENT_TYPE_LABELS = {
    "PRODUCTO": "producto",
    "INSUMO": "insumo",
    "SUBSIDIO": "subsidio",
    "CONVOCATORIA": "convocatoria",
    "PROGRAMA": "programa",
    "NORMATIVA": "normativa",
    "NOTICIA": "noticia",
    "OTROS": "otros",
}


def get_announcement_type_label(category: str) -> str:
    return ANNOUNCEMENT_TYPE_LABELS.get(category, "anuncio")
