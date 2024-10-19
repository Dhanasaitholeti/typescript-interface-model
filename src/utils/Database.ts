import { Pool } from "pg";
import { getEnv } from "./manage-env";

let poolInstance: Pool | null = null;

const getPool = (): Pool => {
  if (!poolInstance) {
    poolInstance = new Pool({
      user: getEnv("DB_USER"),
      password: getEnv("DB_PWD"),
      host: getEnv("DB_HOST"),
      port: Number(getEnv("DB_PORT")),
      database: getEnv("DB_NAME"),
    });

    poolInstance.on("error", (err, client) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });

    poolInstance.on("connect", (client) => {
      console.log("Database connected :)");
    });
  }

  return poolInstance;
};

export const pool = getPool();
