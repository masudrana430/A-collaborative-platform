import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { signupService, loginService } from "./auth.service";
import { successResponse } from "../../utils/response";

export const signup = async (req: Request, res: Response): Promise<void> => {
  const user = await signupService(req.body);

  successResponse(
    res,
    StatusCodes.CREATED,
    "User registered successfully",
    user
  );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const data = await loginService(req.body);

  successResponse(res, StatusCodes.OK, "Login successful", data);
};