import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("No DATABASE_URL found.")
    exit(1)

engine = create_engine(database_url)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;"))
        conn.commit()
        print("Migracion exitosa: columna must_change_password añadida a users.")
    except Exception as e:
        print(f"Error o posible migracion ya aplicada: {e}")
