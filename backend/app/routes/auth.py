from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password, hash_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UpdatePasswordRequest
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


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


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)

@router.post("/update-password", response_model=UserResponse)
def update_password(data: UpdatePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 8 caracteres"
        )
        
    current_user.password_hash = hash_password(data.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user)