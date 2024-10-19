import { NextFunction, Request, Response } from "express";
const ErrorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.json({ error: true, message: err.message });
};
export default ErrorMiddleware;
