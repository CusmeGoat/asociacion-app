from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class UserCreate(BaseModel):
    nombres: str
    apellidos: str
    cedula: str
    email: str
    password: str

    @field_validator("cedula")
    @classmethod
    def validate_cedula(cls, v):
        if not v.isdigit():
            raise ValueError("La cédula debe ser numérica")
        if len(v) != 10:
            raise ValueError("La cédula debe tener 10 dígitos")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UserResponse(BaseModel):
    id: int
    nombres: str
    apellidos: str
    cedula: str | None = None
    email: str
    is_active: bool
    must_change_password: bool = False
    created_at: datetime | None = None
    roles: list[str]

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role_name: str


class UserTempPasswordResponse(BaseModel):
    temp_password: str