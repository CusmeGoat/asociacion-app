from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.auth_service import AuthApplicationService
from app.core.deps import get_current_user
from app.db.database import get_db
from app.infrastructure.repositories import (
    SqlAlchemyPasswordResetRepository,
    SqlAlchemyUserRepository,
)
from app.infrastructure.services import SmtpEmailService
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdatePasswordRequest,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def build_auth_service(db: Session) -> AuthApplicationService:
    return AuthApplicationService(
        users=SqlAlchemyUserRepository(db),
        password_resets=SqlAlchemyPasswordResetRepository(db),
        email_service=SmtpEmailService(),
    )


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
    return build_auth_service(db).login(data.email, data.password)


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)


@router.post("/update-password", response_model=UserResponse)
def update_password(
    data: UpdatePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = build_auth_service(db).update_password(current_user, data.new_password)
    return user_to_response(user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return build_auth_service(db).forgot_password(data.email)


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    return build_auth_service(db).reset_password(data.token, data.new_password)
