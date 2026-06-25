import { Router } from "express";

import { ChatbotService } from "../../../application/services/ChatbotService";
import { AppError } from "../../../shared/errors/AppError";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate } from "../middlewares/authenticate";

export const chatbotRouter = Router();
const service = new ChatbotService();

chatbotRouter.post(
  "/consultar",
  authenticate,
  asyncHandler(async (req, res) => {
    const pregunta = req.body.pregunta?.toString().trim();
    if (!pregunta) {
      throw new AppError(400, "La pregunta es obligatoria.");
    }

    res.json(await service.consultar(pregunta));
  }),
);
