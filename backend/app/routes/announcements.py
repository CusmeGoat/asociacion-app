import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_current_user, require_secretario
from app.db.database import get_db
from app.models.announcement import Announcement
from app.models.notification import Notification
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse, AnnouncementUpdate

router = APIRouter(prefix="/announcements", tags=["announcements"])

ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "application/octet-stream"]
ALLOWED_EXTENSIONS = [".jpeg", ".jpg", ".png"]
MAX_IMAGE_SIZE = 10 * 1024 * 1024

PRODUCT_CATEGORIES = ["PRODUCTO", "INSUMO"]
INSTITUTIONAL_CATEGORIES = ["SUBSIDIO", "CONVOCATORIA", "PROGRAMA", "NORMATIVA", "NOTICIA", "OTROS"]
ALL_CATEGORIES = PRODUCT_CATEGORIES + INSTITUTIONAL_CATEGORIES


def announcement_to_response(announcement: Announcement) -> AnnouncementResponse:
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        category=announcement.category,
        otros_subtype=announcement.otros_subtype,
        is_active=announcement.is_active,
        image_url=announcement.image_url,
        created_at=announcement.created_at,
        published_by=announcement.published_by,
        publisher_name=f"{announcement.publisher.nombres} {announcement.publisher.apellidos}",
    )


def get_announcement_type_label(category: str) -> str:
    labels = {
        "PRODUCTO": "producto",
        "INSUMO": "insumo",
        "SUBSIDIO": "subsidio",
        "CONVOCATORIA": "convocatoria",
        "PROGRAMA": "programa",
        "NORMATIVA": "normativa",
        "NOTICIA": "noticia",
        "OTROS": "otros",
    }
    return labels.get(category, "anuncio")


def create_notification_for_all_users(announcement, db: Session):
    users = db.query(User).filter(User.is_active == True).all()
    announcement_type = get_announcement_type_label(announcement.category)

    for user in users:
        notification = Notification(
            user_id=user.id,
            title="Nuevo anuncio publicado",
            message=f"Se ha publicado un nuevo anuncio de tipo {announcement_type}: {announcement.title}",
            announcement_type=announcement_type,
            announcement_id=announcement.id,
            is_read=False,
        )
        db.add(notification)

    db.commit()


@router.post("/", response_model=AnnouncementResponse)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.category not in ALL_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Categoría inválida. Categorías permitidas: {', '.join(ALL_CATEGORIES)}",
        )

    if data.category == "OTROS" and data.otros_subtype:
        pass

    announcement = Announcement(
        title=data.title,
        content=data.content,
        category=data.category,
        otros_subtype=data.otros_subtype if data.category == "OTROS" else None,
        is_active=True,
        published_by=current_user.id,
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    create_notification_for_all_users(announcement, db)

    return announcement_to_response(announcement)


@router.get("/", response_model=list[AnnouncementResponse])
def list_announcements(
    categories: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Announcement)

    if not include_inactive or not any(
        role.name == "SECRETARIO" for role in current_user.roles
    ):
        query = query.filter(Announcement.is_active == True)

    if categories:
        category_list = [c.strip().upper() for c in categories.split(",")]
        query = query.filter(Announcement.category.in_(category_list))

    if search:
        query = query.filter(
            or_(
                Announcement.title.ilike(f"%{search}%"),
                Announcement.content.ilike(f"%{search}%"),
            )
        )

    announcements = query.order_by(Announcement.created_at.desc()).all()

    return [announcement_to_response(item) for item in announcements]


@router.put("/{id}", response_model=AnnouncementResponse)
def update_announcement(
    id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    if data.title is not None:
        announcement.title = data.title
    if data.content is not None:
        announcement.content = data.content
    if data.category is not None:
        announcement.category = data.category
    if data.otros_subtype is not None:
        announcement.otros_subtype = (
            data.otros_subtype if data.category == "OTROS" else None
        )

    db.commit()
    db.refresh(announcement)
    return announcement_to_response(announcement)


@router.patch("/{id}/deactivate", response_model=AnnouncementResponse)
def deactivate_announcement(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    announcement.is_active = False
    db.commit()
    db.refresh(announcement)
    return announcement_to_response(announcement)


@router.patch("/{id}/activate", response_model=AnnouncementResponse)
def activate_announcement(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    announcement.is_active = True
    db.commit()
    db.refresh(announcement)
    return announcement_to_response(announcement)


@router.patch("/{id}/image", response_model=AnnouncementResponse)
async def upload_image(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    file_ext = os.path.splitext((file.filename or "").lower())[1]
    content_type_ok = file.content_type in ALLOWED_CONTENT_TYPES
    extension_ok = file_ext in ALLOWED_EXTENSIONS

    if not content_type_ok and not extension_ok:
        raise HTTPException(
            status_code=415, detail="Solo se permiten archivos PNG o JPG."
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413, detail="La imagen no debe superar los 10MB."
        )

    await file.seek(0)

    new_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join("static", "images", new_filename)

    if announcement.image_url:
        old_filename = announcement.image_url.split("/")[-1]
        old_path = os.path.join("static", "images", old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    with open(file_path, "wb") as f:
        f.write(contents)

    announcement.image_url = f"/static/images/{new_filename}"
    db.commit()
    db.refresh(announcement)
    return announcement_to_response(announcement)


@router.delete("/{id}/image", response_model=AnnouncementResponse)
def delete_image(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    if announcement.image_url:
        old_filename = announcement.image_url.split("/")[-1]
        old_path = os.path.join("static", "images", old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

        announcement.image_url = None
        db.commit()
        db.refresh(announcement)

    return announcement_to_response(announcement)