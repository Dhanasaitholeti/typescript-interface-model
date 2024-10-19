import dotenv from "dotenv";
dotenv.config();

interface IEnvVariables {
  DB_HOST: string;
  DB_NAME: string;
  DB_USER: string;
  DB_PWD: string;
  DB_PORT: string;
}

const EnvVariables: IEnvVariables = {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PWD: process.env.DB_PWD,
  DB_PORT: process.env.DB_PORT,
};

export const getEnv = (key: keyof IEnvVariables) => {
  return EnvVariables[key];
};
