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

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS tokens_actualizacion (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      hash_token VARCHAR(255) NOT NULL UNIQUE,
      expira_en TIMESTAMPTZ NOT NULL,
      revocado_en TIMESTAMPTZ NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS ix_tokens_actualizacion_hash_token
    ON tokens_actualizacion (hash_token);
  `);

  await AppDataSource.query(`
    INSERT INTO roles (nombre)
    VALUES ('SOCIO'), ('SECRETARIO')
    ON CONFLICT (nombre) DO NOTHING;
  `);
}
