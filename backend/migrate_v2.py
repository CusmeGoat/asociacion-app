"""
Script de migración para adaptar la BD a los nuevos cambios:
1. Renombrar rol ADMIN → SECRETARIO
2. Agregar columna status a documents
3. Agregar columna otros_subtype a announcements
4. Crear tabla notifications
5. Crear tabla password_reset_tokens
"""
import os
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db.database import Base
from app.models.role import Role
from app.models.user import User
from app.models.document import Document
from app.models.announcement import Announcement
from app.models.notification import Notification
from app.models.password_reset import PasswordResetToken

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)


def run_migration():
    print("=== Migrando base de datos ===\n")

    with Session(engine) as db:
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if admin_role:
            admin_role.name = "SECRETARIO"
            db.commit()
            print("[OK] Rol ADMIN renombrado a SECRETARIO")
        else:
            secretario_role = db.query(Role).filter(Role.name == "SECRETARIO").first()
            if secretario_role:
                print("[OK] El rol SECRETARIO ya existe")
            else:
                db.add(Role(name="SECRETARIO"))
                db.add(Role(name="SOCIO"))
                db.commit()
                print("[OK] Roles SECRETARIO y SOCIO creados")

    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pendiente'"
            ))
            conn.commit()
            print("[OK] Columna status agregada a documents")
        except Exception as e:
            print(f"[INFO] Columna status en documents: {e}")

        try:
            conn.execute(text(
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message TEXT"
            ))
            conn.commit()
            print("[OK] Columna error_message agregada a documents")
        except Exception as e:
            print(f"[INFO] Columna error_message en documents: {e}")

        try:
            conn.execute(text(
                "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS otros_subtype VARCHAR(100)"
            ))
            conn.commit()
            print("[OK] Columna otros_subtype agregada a announcements")
        except Exception as e:
            print(f"[INFO] Columna otros_subtype en announcements: {e}")

    Base.metadata.create_all(bind=engine)
    print("[OK] Nuevas tablas creadas (notifications, password_reset_tokens)")

    print("\n=== Migración completada ===")


if __name__ == "__main__":
    run_migration()