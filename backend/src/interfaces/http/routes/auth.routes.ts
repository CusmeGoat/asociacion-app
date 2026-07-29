import { Router } from "express";

import { AuthService } from "../../../application/services/AuthService";
import { userResponse } from "../../../application/dto/responses";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate } from "../middlewares/authenticate";

export const authRouter = Router();
const service = new AuthService();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    res.json(await service.login(req.body.cedula ?? req.body.email, req.body.password));
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    res.json(await service.refresh(req.body.refresh_token));
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    res.json(await service.logout(req.body.refresh_token));
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(userResponse(req.user!));
  }),
);

authRouter.post(
  "/update-password",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await service.updatePassword(req.user!, req.body.new_password));
  }),
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    res.json(await service.forgotPassword(req.body.email));
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    res.json(await service.resetPassword(req.body.token, req.body.new_password));
  }),
);
