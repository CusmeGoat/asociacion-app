from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    verify_password,
    hash_password,
    generate_reset_token,
)
from app.core.config import RESET_TOKEN_EXPIRE_HOURS
from app.db.database import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UpdatePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
)
from app.schemas.user import UserResponse
from app.core.email_service import send_reset_password_email

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
def update_password(
    data: UpdatePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="La contraseña debe tener al menos 8 caracteres"
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        return ForgotPasswordResponse(
            message="Si el correo existe, recibirás un enlace de restablecimiento."
        )

    token = generate_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)

    reset_entry = PasswordResetToken(
        user_id=user.id, token=token, expires_at=expires_at
    )
    db.add(reset_entry)
    db.commit()

    try:
        # Enviamos el token real por correo
        send_reset_password_email(
            to_email=user.email,
            nombre=f"{user.nombres} {user.apellidos}",
            reset_token=token,
            expires_hours=RESET_TOKEN_EXPIRE_HOURS,
        )
    except Exception as e:
        # En producción podrías usar logging, acá se imprime para depuración
        print(f"Error al enviar correo: {e}")
        # Seguimos devolviendo el 200 para no revelar que falló algo interno si el correo existía
        # o podríamos devolver un 500, pero la convención es no exponer detalles.

    return ForgotPasswordResponse(
        message="Si el correo existe, recibirás un enlace de restablecimiento.",
        reset_token=None, # Ya no devolvemos el token en la respuesta por seguridad
    )


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_entry = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == data.token)
        .first()
    )

    if not reset_entry:
        raise HTTPException(status_code=400, detail="Token de restablecimiento inválido")

    if reset_entry.used_at is not None:
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado")

    if datetime.now(timezone.utc) > reset_entry.expires_at:
        raise HTTPException(status_code=400, detail="El enlace ha expirado")

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="La contraseña debe tener al menos 8 caracteres"
        )

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.password_hash = hash_password(data.new_password)
    reset_entry.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Contraseña actualizada correctamente"}