import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL no está definida. Revisa apps/api/.env",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const query = (text: string, params?: any[]) =>
  pool.query(text, params);
