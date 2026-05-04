import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.security import hash_password
from app.core.deps import get_current_user, require_secretario
from app.db.database import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserTempPasswordResponse,
)

router = APIRouter(prefix="/users", tags=["users"])


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
    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    existing_cedula = db.query(User).filter(User.cedula == user.cedula).first()
    if existing_cedula:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")

    socio_role = db.query(Role).filter(Role.name == "SOCIO").first()
    if not socio_role:
        raise HTTPException(status_code=500, detail="Error de configuración: rol SOCIO no existe")

    hashed_password = hash_password(user.password)

    db_user = User(
        nombres=user.nombres,
        apellidos=user.apellidos,
        cedula=user.cedula,
        email=user.email,
        password_hash=hashed_password,
        is_active=True,
    )

    db_user.roles.append(socio_role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return user_to_response(db_user)


@router.get("/", response_model=list[UserResponse])
def list_users(
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    query = db.query(User)

    if search:
        query = query.filter(
            or_(
                User.nombres.ilike(f"%{search}%"),
                User.apellidos.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.cedula.ilike(f"%{search}%"),
            )
        )

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.all()

    if role:
        role_upper = role.upper()
        users = [u for u in users if any(r.name == role_upper for r in u.roles)]

    return [user_to_response(u) for u in users]


@router.patch("/{id}/activate", response_model=UserResponse)
def activate_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = True
    db.commit()
    db.refresh(user)
    return user_to_response(user)


@router.patch("/{id}/deactivate", response_model=UserResponse)
def deactivate_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    if id == current_user.id:
        raise HTTPException(
            status_code=400, detail="No puedes desactivarte a ti mismo"
        )

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user_to_response(user)


@router.patch("/{id}/role", response_model=UserResponse)
def upddate_user_role(
    id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    if id == current_user.id:
        raise HTTPException(
            status_code=400, detail="No puedes cambiar tu propio rol por seguridad"
        )

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    role = db.query(Role).filter(Role.name == data.role_name.upper()).first()
    if not role:
        raise HTTPException(status_code=400, detail="El rol no existe")

    user.roles.clear()
    user.roles.append(role)
    db.commit()
    db.refresh(user)
    return user_to_response(user)


@router.post("/{id}/temp-password", response_model=UserTempPasswordResponse)
def generate_temp_password(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    characters = string.ascii_letters + string.digits
    temp_password = "Temp" + "".join(random.choice(characters) for i in range(6)) + "!"

    user.password_hash = hash_password(temp_password)
    user.must_change_password = True

    db.commit()

    return UserTempPasswordResponse(temp_password=temp_password)