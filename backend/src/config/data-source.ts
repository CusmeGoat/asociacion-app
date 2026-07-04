import "reflect-metadata";
import { DataSource } from "typeorm";

import { env } from "./env";
import { AnnouncementEntity } from "../infrastructure/persistence/entities/AnnouncementEntity";
import { DocumentEntity } from "../infrastructure/persistence/entities/DocumentEntity";
import { NotificationEntity } from "../infrastructure/persistence/entities/NotificationEntity";
import { PasswordResetTokenEntity } from "../infrastructure/persistence/entities/PasswordResetTokenEntity";
import { RefreshTokenEntity } from "../infrastructure/persistence/entities/RefreshTokenEntity";
import { RoleEntity } from "../infrastructure/persistence/entities/RoleEntity";
import { UserEntity } from "../infrastructure/persistence/entities/UserEntity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: false,
  logging: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
  entities: [
    AnnouncementEntity,
    DocumentEntity,
    NotificationEntity,
    PasswordResetTokenEntity,
    RefreshTokenEntity,
    RoleEntity,
    UserEntity,
  ],
});

const databaseSchemaStatements = [
  `CREATE EXTENSION IF NOT EXISTS postgis;`,
  `CREATE EXTENSION IF NOT EXISTS vector;`,
  `
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL UNIQUE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombres VARCHAR(100) NOT NULL,
      apellidos VARCHAR(100) NOT NULL,
      cedula VARCHAR(20) NULL,
      correo VARCHAR(150) NOT NULL UNIQUE,
      contrasena_hash VARCHAR(255) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS roles_usuario (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (usuario_id, rol_id)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS anuncios (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(150) NOT NULL,
      contenido TEXT NOT NULL,
      categoria VARCHAR(50) NOT NULL,
      otros_subtipo VARCHAR(100) NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      url_imagen VARCHAR(300) NULL,
      eliminado_en TIMESTAMPTZ NULL,
      eliminado_por INTEGER NULL REFERENCES usuarios(id) ON DELETE SET NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      publicado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS notificaciones (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo VARCHAR(200) NOT NULL,
      mensaje VARCHAR(500) NOT NULL,
      tipo_anuncio VARCHAR(50) NOT NULL,
      anuncio_id INTEGER NULL REFERENCES anuncios(id) ON DELETE SET NULL,
      leido BOOLEAN NOT NULL DEFAULT FALSE,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS documentos (
      id SERIAL PRIMARY KEY,
      nombre_archivo VARCHAR(255) NOT NULL,
      ruta_archivo VARCHAR(500) NOT NULL,
      subido_por_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      mensaje_error TEXT NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS tokens_actualizacion (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      hash_token VARCHAR(255) NOT NULL UNIQUE,
      expira_en TIMESTAMPTZ NOT NULL,
      revocado_en TIMESTAMPTZ NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS tokens_restablecimiento_clave (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expira_en TIMESTAMPTZ NOT NULL,
      usado_en TIMESTAMPTZ NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS fragmentos_documento (
      id SERIAL PRIMARY KEY,
      nombre_documento VARCHAR(255) NOT NULL,
      contenido TEXT NOT NULL,
      vector_embedding VECTOR(1024),
      numero_pagina INTEGER NOT NULL,
      indice_fragmento INTEGER NOT NULL
    );
  `,
  `CREATE INDEX IF NOT EXISTS ix_roles_usuario_usuario_id ON roles_usuario(usuario_id);`,
  `CREATE INDEX IF NOT EXISTS ix_roles_usuario_rol_id ON roles_usuario(rol_id);`,
  `CREATE INDEX IF NOT EXISTS ix_anuncios_publicado_por ON anuncios(publicado_por);`,
  `CREATE INDEX IF NOT EXISTS ix_anuncios_activo ON anuncios(activo);`,
  `CREATE INDEX IF NOT EXISTS ix_notificaciones_usuario_leido ON notificaciones(usuario_id, leido);`,
  `CREATE INDEX IF NOT EXISTS ix_documentos_estado ON documentos(estado);`,
  `CREATE INDEX IF NOT EXISTS ix_tokens_actualizacion_hash_token ON tokens_actualizacion(hash_token);`,
  `CREATE INDEX IF NOT EXISTS ix_tokens_restablecimiento_token ON tokens_restablecimiento_clave(token);`,
  `CREATE INDEX IF NOT EXISTS ix_fragmentos_documento_nombre ON fragmentos_documento(nombre_documento);`,
  `
    CREATE INDEX IF NOT EXISTS ix_fragmentos_documento_vector
    ON fragmentos_documento USING ivfflat (vector_embedding vector_cosine_ops)
    WITH (lists = 100);
  `,
  `
    INSERT INTO roles (nombre)
    VALUES ('SOCIO'), ('SECRETARIO')
    ON CONFLICT (nombre) DO NOTHING;
  `,
];

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  for (const statement of databaseSchemaStatements) {
    await AppDataSource.query(statement);
  }
}
