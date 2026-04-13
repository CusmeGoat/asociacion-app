from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.database import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        nombres=user.nombres,
        apellidos=user.apellidos,
        cedula=user.cedula,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at,
        roles=[role.name for role in user.roles],
    )


@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    role = db.query(Role).filter(Role.name == user.role_name.upper()).first()
    if not role:
        raise HTTPException(status_code=400, detail="El rol no existe")

    hashed_password = hash_password(user.password)

    db_user = User(
        nombres=user.nombres,
        apellidos=user.apellidos,
        cedula=user.cedula,
        email=user.email,
        password_hash=hashed_password,
        is_active=True,
    )

    db_user.roles.append(role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return user_to_response(db_user)


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [user_to_response(user) for user in users]