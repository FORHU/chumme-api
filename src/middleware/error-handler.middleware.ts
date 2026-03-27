import { Request, Response, NextFunction } from "express";
import { createErrorResponse } from "../utils/error-format.util";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const errorResponse = createErrorResponse(err);
  res.status(err.statusCode || 500).json(errorResponse);
}
