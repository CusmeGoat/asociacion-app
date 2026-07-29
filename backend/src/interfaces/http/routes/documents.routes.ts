import { Router } from "express";

import { DocumentService } from "../../../application/services/DocumentService";
import { AppError } from "../../../shared/errors/AppError";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate, authorize } from "../middlewares/authenticate";
import { documentUpload } from "../uploads";

export const documentsRouter = Router();
const service = new DocumentService();

documentsRouter.get(
  "/public/:documentId/ver",
  asyncHandler(async (req, res) => {
    const file = await service.getFile(req.params.documentId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${file.filename.replace(/"/g, "")}"`);
    res.sendFile(file.absolutePath);
  }),
);

documentsRouter.get(
  "/public/:documentId/paginas/:page/preview",
  asyncHandler(async (req, res) => {
    const preview = await service.getPagePreview(
      req.params.documentId,
      Number(req.params.page),
    );
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${preview.filename.replace(/"/g, "")}-pagina-${req.params.page}.png"`,
    );
    res.send(preview.image);
  }),
);

documentsRouter.use(authenticate);

documentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await service.list());
  }),
);

documentsRouter.post(
  "/cargar",
  authorize("SECRETARIO"),
  documentUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "Selecciona un archivo PDF para subir.");
    }
    res.json(await service.upload(req.file!, req.user!.id));
  }),
);

documentsRouter.delete(
  "/:documentId",
  authorize("SECRETARIO"),
  asyncHandler(async (req, res) => {
    res.json(await service.delete(req.params.documentId));
  }),
);
