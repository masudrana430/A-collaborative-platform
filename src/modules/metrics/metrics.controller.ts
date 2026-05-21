import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getMetricsService } from "./metrics.service";
import { dataResponse } from "../../utils/response";

export const getMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  const metrics = await getMetricsService();

  dataResponse(res, StatusCodes.OK, metrics);
};