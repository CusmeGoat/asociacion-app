import random
import string

from app.application.exceptions import ApplicationError
from app.application.ports.repositories import UserRepositoryPort
from app.core.security import hash_password


class UserApplicationService:
    def __init__(self, users: UserRepositoryPort):
        self.users = users

    def create_user(self, data: dict):
        if self.users.find_by_email(data["email"]):
            raise ApplicationError(status_code=400, detail="El correo ya esta registrado")

        if self.users.find_by_cedula(data["cedula"]):
            raise ApplicationError(status_code=400, detail="La cedula ya esta registrada")

        socio_role = self.users.find_role_by_name("SOCIO")
        if not socio_role:
            raise ApplicationError(
                status_code=500,
                detail="Error de configuracion: rol SOCIO no existe",
            )

        return self.users.create_user(
            data=data,
            role=socio_role,
            password_hash=hash_password(data["password"]),
        )

    def list_users(
        self,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ):
        users = self.users.list_users(search=search, is_active=is_active)

        if role:
            role_upper = role.upper()
            users = [user for user in users if any(r.name == role_upper for r in user.roles)]

        return users

    def activate_user(self, user_id: int):
        user = self._get_user(user_id)
        user.is_active = True
        return self.users.save(user)

    def deactivate_user(self, user_id: int, current_user_id: int):
        if user_id == current_user_id:
            raise ApplicationError(status_code=400, detail="No puedes desactivarte a ti mismo")

        user = self._get_user(user_id)
        user.is_active = False
        return self.users.save(user)

    def update_role(self, user_id: int, role_name: str, current_user_id: int):
        if user_id == current_user_id:
            raise ApplicationError(
                status_code=400,
                detail="No puedes cambiar tu propio rol por seguridad",
            )

        user = self._get_user(user_id)
        role = self.users.find_role_by_name(role_name.upper())
        if not role:
            raise ApplicationError(status_code=400, detail="El rol no existe")

        user.roles.clear()
        user.roles.append(role)
        return self.users.save(user)

    def generate_temp_password(self, user_id: int) -> str:
        user = self._get_user(user_id)

        characters = string.ascii_letters + string.digits
        temp_password = "Temp" + "".join(random.choice(characters) for _ in range(6)) + "!"

        user.password_hash = hash_password(temp_password)
        user.must_change_password = True
        self.users.save(user)

        return temp_password

    def _get_user(self, user_id: int):
        user = self.users.find_by_id(user_id)
        if not user:
            raise ApplicationError(status_code=404, detail="Usuario no encontrado")
        return user
