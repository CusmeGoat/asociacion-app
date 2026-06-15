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
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash
    ON refresh_tokens (token_hash);
  `);

  await AppDataSource.query(`
    INSERT INTO roles (name)
    VALUES ('SOCIO'), ('SECRETARIO')
    ON CONFLICT (name) DO NOTHING;
  `);
}
