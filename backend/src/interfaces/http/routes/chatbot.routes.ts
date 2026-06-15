import { Router } from "express";

import { ChatbotService } from "../../../application/services/ChatbotService";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate } from "../middlewares/authenticate";

export const chatbotRouter = Router();
const service = new ChatbotService();

chatbotRouter.post(
  "/consultar",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await service.consultar(req.body.pregunta));
  }),
);
