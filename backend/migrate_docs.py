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
        # Create documents table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Opcional_index
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_documents_id ON documents (id);"))
        conn.commit()
        print("Migracion exitosa: tabla documents creada correctamente.")
    except Exception as e:
        print(f"Error o posible migracion ya aplicada: {e}")
