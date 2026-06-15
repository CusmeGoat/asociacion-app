import { Router } from "express";

import { DocumentService } from "../../../application/services/DocumentService";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate, authorize } from "../middlewares/authenticate";
import { documentUpload } from "../uploads";

export const documentsRouter = Router();
const service = new DocumentService();

documentsRouter.use(authenticate, authorize("SECRETARIO"));

documentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await service.list());
  }),
);

documentsRouter.post(
  "/cargar",
  documentUpload.single("file"),
  asyncHandler(async (req, res) => {
    res.json(await service.upload(req.file!, req.user!.id));
  }),
);

documentsRouter.delete(
  "/:documentId",
  asyncHandler(async (req, res) => {
    res.json(await service.delete(Number(req.params.documentId)));
  }),
);
