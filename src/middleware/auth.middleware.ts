import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/appError";

interface JwtUserPayload {
  id: number;
  name: string;
  role: "contributor" | "maintainer";
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization;

  if (!token) {
    throw new AppError("Authorization token is required", StatusCodes.UNAUTHORIZED);
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError("JWT secret is missing", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtUserPayload;

    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role
    };

    next();
  } catch {
    throw new AppError("Invalid or expired token", StatusCodes.UNAUTHORIZED);
  }
};