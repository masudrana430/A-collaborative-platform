import { Response } from "express";

export const successResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const dataResponse = (
  res: Response,
  statusCode: number,
  data: unknown
) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

export const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};