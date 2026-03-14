from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["announcements"])


# ── Helper: modelo → respuesta ────────────────────────────────────────────────

def announcement_to_response(announcement: Announcement) -> AnnouncementResponse:
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        category=announcement.category,
        is_active=announcement.is_active,
        created_at=announcement.created_at,
        published_by=announcement.published_by,
        publisher_name=f"{announcement.publisher.nombres} {announcement.publisher.apellidos}",
    )


# ── Helper: buscar o lanzar 404 ───────────────────────────────────────────────

def get_announcement_or_404(announcement_id: int, db: Session) -> Announcement:
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anuncio {announcement_id} no encontrado.",
        )
    return ann


# ── POST / ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=AnnouncementResponse)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    announcement = Announcement(
        title=data.title,
        content=data.content,
        category=data.category.strip(),
        is_active=True,
        published_by=current_user.id,
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    return announcement_to_response(announcement)


# ── GET / ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AnnouncementResponse])
def list_announcements(
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Announcement)

    # Solo ADMIN puede pedir incluir inactivos
    is_admin = any(r.name == "ADMIN" for r in current_user.roles)
    if not (is_admin and include_inactive):
        query = query.filter(Announcement.is_active == True)

    if category and category.strip() and category.upper() != "TODAS":
        query = query.filter(Announcement.category.ilike(category.strip()))

    if search and search.strip():
        text = f"%{search.strip()}%"
        query = query.filter(
            Announcement.title.ilike(text) |
            Announcement.content.ilike(text) |
            Announcement.category.ilike(text)
        )

    announcements = query.order_by(Announcement.created_at.desc()).all()
    return [announcement_to_response(item) for item in announcements]


# ── PUT /{id} — editar ────────────────────────────────────────────────────────

@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Actualiza título, contenido y/o categoría.
    Solo envía los campos que quieres cambiar; los demás se conservan.
    """
    ann = get_announcement_or_404(announcement_id, db)

    if data.title is not None:
        ann.title = data.title.strip()
    if data.content is not None:
        ann.content = data.content.strip()
    if data.category is not None:
        ann.category = data.category.strip()

    db.commit()
    db.refresh(ann)
    return announcement_to_response(ann)


# ── PATCH /{id}/deactivate — desactivar ───────────────────────────────────────

@router.patch("/{announcement_id}/deactivate", response_model=AnnouncementResponse)
def deactivate_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Soft-delete: pone is_active = False.
    El anuncio deja de aparecer para los socios pero no se borra.
    """
    ann = get_announcement_or_404(announcement_id, db)

    if not ann.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El anuncio ya está desactivado.",
        )

    ann.is_active = False
    db.commit()
    db.refresh(ann)
    return announcement_to_response(ann)


# ── PATCH /{id}/activate — reactivar ─────────────────────────────────────────

@router.patch("/{announcement_id}/activate", response_model=AnnouncementResponse)
def activate_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Reactiva un anuncio previamente desactivado.
    """
    ann = get_announcement_or_404(announcement_id, db)

    if ann.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El anuncio ya está activo.",
        )

    ann.is_active = True
    db.commit()
    db.refresh(ann)
    return announcement_to_response(ann)