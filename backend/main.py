from contextlib import asynccontextmanager

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.db.database import Base, engine, test_connection
from app.models import Announcement, Role, User, DocumentChunk  # noqa: F401
from app.routes.announcements import router as announcements_router
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.documents import router as documents_router
from app.routes.chatbot import router as chatbot_router


def seed_roles():
    with Session(engine) as db:
        existing_roles = db.query(Role).all()
        if not existing_roles:
            db.add_all([
                Role(name="ADMIN"),
                Role(name="SOCIO"),
            ])
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_roles()
    yield


app = FastAPI(lifespan=lifespan)

os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(auth_router)
app.include_router(announcements_router)
app.include_router(documents_router)
app.include_router(chatbot_router)


@app.get("/")
def read_root():
    return {"message": "Backend funcionando correctamente"}


@app.get("/db-test")
def db_test():
    result = test_connection()
    return {
        "message": "Conexión a PostgreSQL exitosa",
        "result": result
    }


@app.get("/tables")
def list_tables():
    inspector = inspect(engine)
    return {"tables": inspector.get_table_names()}