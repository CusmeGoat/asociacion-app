import { Router } from "express";

import { NotificationService } from "../../../application/services/NotificationService";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate } from "../middlewares/authenticate";

export const notificationsRouter = Router();
const service = new NotificationService();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.user!.id));
  }),
);

notificationsRouter.get(
  "/no-leidas",
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.user!.id, true));
  }),
);

notificationsRouter.get(
  "/no-leidas/count",
  asyncHandler(async (req, res) => {
    res.json(await service.unreadCount(req.user!.id));
  }),
);

notificationsRouter.patch(
  "/leer-todas",
  asyncHandler(async (req, res) => {
    res.json(await service.markAllAsRead(req.user!.id));
  }),
);

notificationsRouter.patch(
  "/:id/leer",
  asyncHandler(async (req, res) => {
    res.json(await service.markAsRead(req.params.id, req.user!.id));
  }),
);
