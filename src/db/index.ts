import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is not configured");
const sql = globalDb.sql ?? postgres(process.env.DATABASE_URL, { max: 5 });
if (process.env.NODE_ENV !== "production") globalDb.sql = sql;
export const db = drizzle(sql, { schema });
