import { drizzle } from "drizzle-orm/libsql";
import type { Client } from "@libsql/client";
import * as schema from "./db/schema";

export function createDb(connection: Client) {
  return drizzle(connection, { schema });
}

export type Database = ReturnType<typeof createDb>;
