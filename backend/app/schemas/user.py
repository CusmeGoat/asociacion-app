from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    nombres: str
    apellidos: str
    cedula: str
    email: str
    password: str
    role_name: str


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