import { Router } from "express";
import { getMetrics } from "./metrics.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireMaintainer } from "../../middleware/role.middleware";

const router = Router();

router.get("/", authMiddleware, requireMaintainer, asyncHandler(getMetrics));

export default router;