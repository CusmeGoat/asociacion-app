from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    nombres: str
    apellidos: str
    email: str
    password: str
    role_name: str


class UserResponse(BaseModel):
    id: int
    nombres: str
    apellidos: str
    email: str
    is_active: bool
    created_at: datetime | None = None
    roles: list[str]

    model_config = ConfigDict(from_attributes=True)