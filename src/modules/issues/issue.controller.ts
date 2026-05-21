import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createIssueService,
  getAllIssuesService,
  getSingleIssueService
} from "./issue.service";
import { successResponse, dataResponse } from "../../utils/response";
import { AppError } from "../../utils/appError";

export const createIssue = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
  }

  const issue = await createIssueService(req.body, req.user.id);

  successResponse(
    res,
    StatusCodes.CREATED,
    "Issue created successfully",
    issue
  );
};

export const getAllIssues = async (
  req: Request,
  res: Response
): Promise<void> => {
  const issues = await getAllIssuesService({
    sort: req.query.sort as "newest" | "oldest" | undefined,
    type: req.query.type as "bug" | "feature_request" | undefined,
    status: req.query.status as "open" | "in_progress" | "resolved" | undefined
  });

  dataResponse(res, StatusCodes.OK, issues);
};

export const getSingleIssue = async (
  req: Request,
  res: Response
): Promise<void> => {
  const issueId = Number(req.params.id);

  if (Number.isNaN(issueId)) {
    throw new AppError("Invalid issue id", StatusCodes.BAD_REQUEST);
  }

  const issue = await getSingleIssueService(issueId);

  dataResponse(res, StatusCodes.OK, issue);
};