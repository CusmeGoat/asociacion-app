import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://managerice:managerice123@localhost:5432/managerice_db",
  jwtSecret: process.env.JWT_SECRET ?? process.env.SECRET_KEY ?? "dev-secret-key",
  jwtAlgorithm: (process.env.JWT_ALGORITHM ?? process.env.ALGORITHM ?? "HS256") as "HS256",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30),
  semanticServiceUrl: process.env.SEMANTIC_SERVICE_URL ?? "http://127.0.0.1:8010",
  staticRoot: process.env.STATIC_ROOT ?? "static",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    fromName: process.env.SMTP_FROM_NAME ?? "Asociacion Agricola 10 de Mayo",
    fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? "",
  },
};
