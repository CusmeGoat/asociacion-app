-- Migracion complementaria para integrar el modulo movil/chatbot
-- con la base unificada de Railway sin borrar tablas ni columnas existentes.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE "TipoDocumento" AS ENUM ('CHATBOT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'CHATBOT';

DO $$
BEGIN
  CREATE TYPE "EstadoDocumento" AS ENUM ('ACTIVO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "EstadoDocumento" ADD VALUE IF NOT EXISTS 'ACTIVO';

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS roles (
  nombre TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS roles_usuario (
  "usuarioId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "rolNombre" TEXT NOT NULL REFERENCES roles(nombre) ON DELETE CASCADE,
  PRIMARY KEY ("usuarioId", "rolNombre")
);

ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS "chatbotEstado" VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS "chatbotMensajeError" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "chatbotRutaArchivo" TEXT NULL;

ALTER TABLE documentos
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS fragmentos_documento (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "nombreDocumento" VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  "vectorEmbedding" VECTOR(1024),
  "numeroPagina" INTEGER NOT NULL,
  "indiceFragmento" INTEGER NOT NULL
);

ALTER TABLE fragmentos_documento
  ADD COLUMN IF NOT EXISTS "nombreDocumento" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contenido TEXT,
  ADD COLUMN IF NOT EXISTS "vectorEmbedding" VECTOR(1024),
  ADD COLUMN IF NOT EXISTS "numeroPagina" INTEGER,
  ADD COLUMN IF NOT EXISTS "indiceFragmento" INTEGER;

CREATE INDEX IF NOT EXISTS ix_roles_usuario_usuario_id ON roles_usuario("usuarioId");
CREATE INDEX IF NOT EXISTS ix_roles_usuario_rol_nombre ON roles_usuario("rolNombre");
CREATE INDEX IF NOT EXISTS ix_documentos_chatbot_estado ON documentos("chatbotEstado");
CREATE INDEX IF NOT EXISTS ix_fragmentos_documento_nombre ON fragmentos_documento("nombreDocumento");
CREATE INDEX IF NOT EXISTS ix_fragmentos_documento_vector
  ON fragmentos_documento USING ivfflat ("vectorEmbedding" vector_cosine_ops)
  WITH (lists = 100);

INSERT INTO roles (nombre)
VALUES ('SOCIO'), ('SECRETARIO')
ON CONFLICT (nombre) DO NOTHING;

-- Rol minimo para que todo usuario pueda usar anuncios, biblioteca y chatbot.
INSERT INTO roles_usuario ("usuarioId", "rolNombre")
SELECT u.id, 'SOCIO'
FROM usuarios u
WHERE NOT EXISTS (
  SELECT 1
  FROM roles_usuario ru
  WHERE ru."usuarioId" = u.id
)
ON CONFLICT ("usuarioId", "rolNombre") DO NOTHING;

-- Usuarios administrativos conocidos del proyecto.
INSERT INTO roles_usuario ("usuarioId", "rolNombre")
SELECT u.id, 'SECRETARIO'
FROM usuarios u
WHERE lower(coalesce(u.email, '')) IN ('secretaria@10demayo.org', 'admin@managerice.com')
ON CONFLICT ("usuarioId", "rolNombre") DO NOTHING;

-- Si la tabla socios existe, toma de ahi secretarios/admin sin modificar socios.
DO $$
BEGIN
  IF to_regclass('public.socios') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO roles_usuario ("usuarioId", "rolNombre")
      SELECT s."usuarioId", ''SECRETARIO''
      FROM socios s
      WHERE s."usuarioId" IS NOT NULL
        AND (
          upper(coalesce(s.rol::text, '''')) LIKE ''%SECRET%''
          OR upper(coalesce(s.rol::text, '''')) LIKE ''%ADMIN%''
          OR upper(coalesce(s."nivelAcceso"::text, '''')) LIKE ''%SECRET%''
          OR upper(coalesce(s."nivelAcceso"::text, '''')) LIKE ''%ADMIN%''
        )
      ON CONFLICT ("usuarioId", "rolNombre") DO NOTHING
    ';
  END IF;
END $$;
