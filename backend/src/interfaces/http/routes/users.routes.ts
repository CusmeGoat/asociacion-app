import { Router } from "express";

import { UserService } from "../../../application/services/UserService";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { authenticate, authorize } from "../middlewares/authenticate";

export const usersRouter = Router();
const service = new UserService();

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  }),
);

usersRouter.use(authenticate, authorize("SECRETARIO"));

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isActive =
      req.query.is_active === undefined ? undefined : req.query.is_active === "true";
    res.json(
      await service.list({
        search: req.query.search?.toString(),
        role: req.query.role?.toString(),
        isActive,
      }),
    );
  }),
);

usersRouter.patch(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    res.json(await service.activate(req.params.id));
  }),
);

usersRouter.patch(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    res.json(await service.deactivate(req.params.id, req.user!.id));
  }),
);

usersRouter.patch(
  "/:id/role",
  asyncHandler(async (req, res) => {
    res.json(await service.changeRole(req.params.id, req.body.role_name, req.user!.id));
  }),
);

usersRouter.post(
  "/:id/temp-password",
  asyncHandler(async (req, res) => {
    res.json(await service.generateTempPassword(req.params.id));
  }),
);
