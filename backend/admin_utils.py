"""
Script de administración rápida de usuarios.
Uso:
  Listar usuarios:           python admin_utils.py list
  Cambiar contraseña:        python admin_utils.py reset-password <email> <nueva_contraseña>
  Dar rol ADMIN:             python admin_utils.py make-admin <email>
  Quitar rol ADMIN:          python admin_utils.py remove-admin <email>
"""
import sys
import os

# Cargar .env antes de importar modelos
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.db.database import engine
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password


def list_users():
    with Session(engine) as db:
        users = db.query(User).all()
        if not users:
            print("No hay usuarios registrados.")
            return
        print("\n=== USUARIOS REGISTRADOS ===")
        print(f"{'ID':<5} {'Nombre':<30} {'Email':<35} {'Roles':<15} {'Activo'}")
        print("-" * 95)
        for u in users:
            roles = ", ".join([r.name for r in u.roles])
            print(f"{u.id:<5} {f'{u.nombres} {u.apellidos}':<30} {u.email:<35} {roles:<15} {u.is_active}")
        print()


def reset_password(email: str, new_password: str):
    if len(new_password) < 8:
        print("[ERROR] La contrasena debe tener al menos 8 caracteres.")
        return
    with Session(engine) as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[ERROR] No se encontro usuario con email: {email}")
            return
        user.password_hash = hash_password(new_password)
        db.commit()
        print(f"[OK] Contrasena actualizada correctamente para: {email}")


def make_admin(email: str):
    with Session(engine) as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[ERROR] No se encontro usuario con email: {email}")
            return
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            print("[ERROR] El rol ADMIN no existe en la base de datos.")
            return
        if any(r.name == "ADMIN" for r in user.roles):
            print(f"[AVISO] El usuario {email} ya tiene rol ADMIN.")
            return
        user.roles.append(admin_role)
        db.commit()
        print(f"[OK] El usuario {email} ahora es ADMIN.")


def remove_admin(email: str):
    with Session(engine) as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[ERROR] No se encontro usuario con email: {email}")
            return
        admin_role = next((r for r in user.roles if r.name == "ADMIN"), None)
        if not admin_role:
            print(f"[AVISO] El usuario {email} no tiene rol ADMIN.")
            return
        user.roles.remove(admin_role)
        db.commit()
        print(f"[OK] Se removio el rol ADMIN de: {email}")


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] == "list":
        list_users()
    elif args[0] == "reset-password" and len(args) == 3:
        reset_password(args[1], args[2])
    elif args[0] == "make-admin" and len(args) == 2:
        make_admin(args[1])
    elif args[0] == "remove-admin" and len(args) == 2:
        remove_admin(args[1])
    else:
        print(__doc__)
