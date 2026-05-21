import { Router } from "express";
import {
  createIssue,
  getAllIssues,
  getSingleIssue
} from "./issue.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, asyncHandler(createIssue));
router.get("/", asyncHandler(getAllIssues));
router.get("/:id", asyncHandler(getSingleIssue));

export default router;