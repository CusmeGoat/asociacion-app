-- Base local compatible con el esquema unificado de Railway.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE "TipoDocumento" AS ENUM ('CHATBOT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EstadoDocumento" AS ENUM ('ACTIVO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cedula VARCHAR NOT NULL DEFAULT '',
  "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS roles (
  nombre TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS roles_usuario (
  "usuarioId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "rolNombre" TEXT NOT NULL REFERENCES roles(nombre) ON DELETE CASCADE,
  PRIMARY KEY ("usuarioId", "rolNombre")
);

CREATE TABLE IF NOT EXISTS anuncios (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  "otrosSubtipo" VARCHAR NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  "urlImagen" VARCHAR NULL,
  "eliminadoEn" TIMESTAMPTZ NULL,
  "eliminadoPorId" TEXT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  "publicadoPorId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "usuarioId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  "tipoAnuncio" VARCHAR(50) NOT NULL,
  "anuncioId" TEXT NULL REFERENCES anuncios(id) ON DELETE SET NULL,
  leido BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  tipo "TipoDocumento" NOT NULL,
  descripcion TEXT NULL,
  fecha TIMESTAMP NOT NULL,
  estado "EstadoDocumento" NOT NULL DEFAULT 'ACTIVO',
  "archivoUrl" TEXT NULL,
  "archivoNombre" TEXT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoPorId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "chatbotEstado" VARCHAR(20) NULL,
  "chatbotMensajeError" TEXT NULL,
  "chatbotRutaArchivo" TEXT NULL
);

CREATE TABLE IF NOT EXISTS tokens_actualizacion (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "usuarioId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  "hashToken" VARCHAR(255) NOT NULL UNIQUE,
  "expiraEn" TIMESTAMPTZ NOT NULL,
  "revocadoEn" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tokens_restablecimiento_clave (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "usuarioId" TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  "expiraEn" TIMESTAMPTZ NOT NULL,
  "usadoEn" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fragmentos_documento (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "nombreDocumento" VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  "vectorEmbedding" VECTOR(1024),
  "numeroPagina" INTEGER NOT NULL,
  "indiceFragmento" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_roles_usuario_usuario_id ON roles_usuario("usuarioId");
CREATE INDEX IF NOT EXISTS ix_roles_usuario_rol_nombre ON roles_usuario("rolNombre");
CREATE INDEX IF NOT EXISTS ix_anuncios_publicado_por ON anuncios("publicadoPorId");
CREATE INDEX IF NOT EXISTS ix_anuncios_activo ON anuncios(activo);
CREATE INDEX IF NOT EXISTS ix_notificaciones_usuario_leido ON notificaciones("usuarioId", leido);
CREATE INDEX IF NOT EXISTS ix_documentos_chatbot_estado ON documentos("chatbotEstado");
CREATE INDEX IF NOT EXISTS ix_tokens_actualizacion_hash_token ON tokens_actualizacion("hashToken");
CREATE INDEX IF NOT EXISTS ix_tokens_restablecimiento_token ON tokens_restablecimiento_clave(token);
CREATE INDEX IF NOT EXISTS ix_fragmentos_documento_nombre ON fragmentos_documento("nombreDocumento");
CREATE INDEX IF NOT EXISTS ix_fragmentos_documento_vector
  ON fragmentos_documento USING ivfflat ("vectorEmbedding" vector_cosine_ops)
  WITH (lists = 100);

INSERT INTO roles (nombre)
VALUES ('SOCIO'), ('SECRETARIO')
ON CONFLICT (nombre) DO NOTHING;
