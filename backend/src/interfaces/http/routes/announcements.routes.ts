import { Router } from "express";
import type { Request } from "express";

import { AnnouncementService } from "../../../application/services/AnnouncementService";
import { AppError } from "../../../shared/errors/AppError";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate, authorize } from "../middlewares/authenticate";
import { imageUpload } from "../uploads";

export const announcementsRouter = Router();
const service = new AnnouncementService();

function isSecretary(req: Request) {
  const roles = req.user?.roles.map((role) => role.name) ?? [];
  return roles.includes("SECRETARIO");
}

announcementsRouter.use(authenticate);

announcementsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(
      await service.list({
        categories: req.query.categories?.toString(),
        search: req.query.search?.toString(),
        includeInactive: req.query.include_inactive === "true",
        isSecretary: isSecretary(req),
      }),
    );
  }),
);

announcementsRouter.post(
  "/",
  authorize("SOCIO", "SECRETARIO"),
  imageUpload.single("file"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body, req.user!.id, req.file));
  }),
);

announcementsRouter.put(
  "/:id",
  authorize("SOCIO", "SECRETARIO"),
  imageUpload.single("file"),
  asyncHandler(async (req, res) => {
    res.json(
      await service.update(
        Number(req.params.id),
        req.body,
        req.user!.id,
        isSecretary(req),
        req.file,
      ),
    );
  }),
);

announcementsRouter.patch(
  "/:id/deactivate",
  authorize("SECRETARIO"),
  asyncHandler(async (req, res) => {
    res.json(await service.setActive(Number(req.params.id), false));
  }),
);

announcementsRouter.patch(
  "/:id/activate",
  authorize("SECRETARIO"),
  asyncHandler(async (req, res) => {
    res.json(await service.setActive(Number(req.params.id), true));
  }),
);

announcementsRouter.patch(
  "/:id/image",
  authorize("SOCIO", "SECRETARIO"),
  imageUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "Selecciona una imagen JPG o PNG para el anuncio.");
    }
    res.json(
      await service.setImage(
        Number(req.params.id),
        req.file!,
        req.user!.id,
        isSecretary(req),
      ),
    );
  }),
);

announcementsRouter.delete(
  "/:id/image",
  authorize("SOCIO", "SECRETARIO"),
  asyncHandler(async (req, res) => {
    res.json(
      await service.deleteImage(
        Number(req.params.id),
        req.user!.id,
        isSecretary(req),
      ),
    );
  }),
);

announcementsRouter.delete(
  "/:id",
  authorize("SOCIO", "SECRETARIO"),
  asyncHandler(async (req, res) => {
    res.json(
      await service.delete(
        Number(req.params.id),
        req.user!.id,
        isSecretary(req),
      ),
    );
  }),
);
