from datetime import datetime, timedelta, timezone

from app.application.exceptions import ApplicationError
from app.application.ports.repositories import (
    PasswordResetRepositoryPort,
    UserRepositoryPort,
)
from app.application.ports.services import EmailServicePort
from app.core.config import RESET_TOKEN_EXPIRE_HOURS
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    verify_password,
)


class AuthApplicationService:
    def __init__(
        self,
        users: UserRepositoryPort,
        password_resets: PasswordResetRepositoryPort,
        email_service: EmailServicePort,
    ):
        self.users = users
        self.password_resets = password_resets
        self.email_service = email_service

    def login(self, email: str, password: str) -> dict[str, str]:
        user = self.users.find_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            raise ApplicationError(status_code=401, detail="Credenciales incorrectas")

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

    def update_password(self, current_user, new_password: str):
        if len(new_password) < 8:
            raise ApplicationError(
                status_code=400,
                detail="La contrasena debe tener al menos 8 caracteres",
            )

        current_user.password_hash = hash_password(new_password)
        current_user.must_change_password = False
        return self.users.save(current_user)

    def forgot_password(self, email: str) -> dict[str, str | None]:
        user = self.users.find_by_email(email)
        message = "Si el correo existe, recibiras un enlace de restablecimiento."

        if not user:
            return {"message": message, "reset_token": None}

        token = generate_reset_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
        self.password_resets.create(user.id, token, expires_at)

        try:
            self.email_service.send_reset_password_email(
                to_email=user.email,
                nombre=f"{user.nombres} {user.apellidos}",
                reset_token=token,
                expires_hours=RESET_TOKEN_EXPIRE_HOURS,
            )
        except Exception as exc:
            print(f"Error al enviar correo: {exc}")

        return {"message": message, "reset_token": None}

    def reset_password(self, token: str, new_password: str) -> dict[str, str]:
        reset_entry = self.password_resets.find_by_token(token)

        if not reset_entry:
            raise ApplicationError(status_code=400, detail="Token de restablecimiento invalido")

        if reset_entry.used_at is not None:
            raise ApplicationError(status_code=400, detail="Este enlace ya fue utilizado")

        if datetime.now(timezone.utc) > reset_entry.expires_at:
            raise ApplicationError(status_code=400, detail="El enlace ha expirado")

        if len(new_password) < 8:
            raise ApplicationError(
                status_code=400,
                detail="La contrasena debe tener al menos 8 caracteres",
            )

        user = self.users.find_by_id(reset_entry.user_id)
        if not user:
            raise ApplicationError(status_code=404, detail="Usuario no encontrado")

        user.password_hash = hash_password(new_password)
        reset_entry.used_at = datetime.now(timezone.utc)
        self.users.save(user)
        self.password_resets.save(reset_entry)

        return {"message": "Contrasena actualizada correctamente"}
