from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.db.database import get_db
from app.models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    return user


def require_secretario(current_user: User = Depends(get_current_user)) -> User:
    is_secretario = any(role.name == "SECRETARIO" for role in current_user.roles)

    if not is_secretario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo SECRETARIO puede realizar esta acción",
        )

    return current_user


def require_socio(current_user: User = Depends(get_current_user)) -> User:
    is_socio = any(role.name == "SOCIO" for role in current_user.roles)

    if not is_socio:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo SOCIO puede realizar esta acción",
        )

    return current_user