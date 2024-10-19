
import { Application, Request, Response } from "express";
export const RouteHandler = (app: Application) => {
  app.get("/", (req: Request, res: Response) => {
    res.status(200).send("The server is working");
  });
};

