import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/appError";

export const requireMaintainer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
  }

  if (req.user.role !== "maintainer") {
    throw new AppError("Maintainer access required", StatusCodes.FORBIDDEN);
  }

  next();
};