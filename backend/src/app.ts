import cors from "cors";
import express from "express";
import path from "path";

import { env } from "./config/env";
import { announcementsRouter } from "./interfaces/http/routes/announcements.routes";
import { authRouter } from "./interfaces/http/routes/auth.routes";
import { chatbotRouter } from "./interfaces/http/routes/chatbot.routes";
import { documentsRouter } from "./interfaces/http/routes/documents.routes";
import { notificationsRouter } from "./interfaces/http/routes/notifications.routes";
import { usersRouter } from "./interfaces/http/routes/users.routes";
import { errorHandler } from "./interfaces/http/middlewares/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use("/static", express.static(path.join(process.cwd(), env.staticRoot)));

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "node-api" }));

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/announcements", announcementsRouter);
  app.use("/documentos", documentsRouter);
  app.use("/chatbot", chatbotRouter);
  app.use("/notificaciones", notificationsRouter);

  app.use(errorHandler);

  return app;
}
