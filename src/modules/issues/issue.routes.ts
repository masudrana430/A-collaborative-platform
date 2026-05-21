import { Router } from "express";
import {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue
} from "./issue.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireMaintainer } from "../../middleware/role.middleware";

const router = Router();

router.post("/", authMiddleware, asyncHandler(createIssue));
router.get("/", asyncHandler(getAllIssues));
router.get("/:id", asyncHandler(getSingleIssue));
router.patch("/:id", authMiddleware, asyncHandler(updateIssue));
router.delete(
  "/:id",
  authMiddleware,
  requireMaintainer,
  asyncHandler(deleteIssue)
);

export default router;