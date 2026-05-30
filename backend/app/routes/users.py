from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.user_service import UserApplicationService
from app.core.deps import require_secretario
from app.db.database import get_db
from app.infrastructure.repositories import SqlAlchemyUserRepository
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserTempPasswordResponse,
)

router = APIRouter(prefix="/users", tags=["users"])


def build_user_service(db: Session) -> UserApplicationService:
    return UserApplicationService(users=SqlAlchemyUserRepository(db))


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        nombres=user.nombres,
        apellidos=user.apellidos,
        cedula=user.cedula,
        email=user.email,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        created_at=user.created_at,
        roles=[role.name for role in user.roles],
    )


@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    created_user = build_user_service(db).create_user(user.model_dump())
    return user_to_response(created_user)


@router.get("/", response_model=list[UserResponse])
def list_users(
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    users = build_user_service(db).list_users(search=search, role=role, is_active=is_active)
    return [user_to_response(user) for user in users]


@router.patch("/{id}/activate", response_model=UserResponse)
def activate_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    user = build_user_service(db).activate_user(id)
    return user_to_response(user)


@router.patch("/{id}/deactivate", response_model=UserResponse)
def deactivate_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    user = build_user_service(db).deactivate_user(id, current_user.id)
    return user_to_response(user)


@router.patch("/{id}/role", response_model=UserResponse)
def upddate_user_role(
    id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    user = build_user_service(db).update_role(id, data.role_name, current_user.id)
    return user_to_response(user)


@router.post("/{id}/temp-password", response_model=UserTempPasswordResponse)
def generate_temp_password(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    temp_password = build_user_service(db).generate_temp_password(id)
    return UserTempPasswordResponse(temp_password=temp_password)
