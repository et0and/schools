import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { Client } from "@libsql/client";

export function createDb(connection: Client) {
  return drizzle(connection, { schema });
}

export type Database = ReturnType<typeof createDb>;
