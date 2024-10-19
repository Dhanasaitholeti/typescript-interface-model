import cors from "cors";
import bodyParser from "body-parser";
import express, { Application } from "express";
import { RouteHandler } from "./routes";
import ErrorMiddleware from "./middlewares/error.middleware";
import { pool } from "./utils/Database";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded());

RouteHandler(app); //for handling routes.

app.use(ErrorMiddleware);

pool.connect();

app.listen(8000, () => {
  console.log("The server is running on http://localhost:8000/");
});
