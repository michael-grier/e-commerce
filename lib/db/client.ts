import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | undefined;
let database: Database | undefined;

export function getDb(): Database {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before database access.");
  }

  if (!client) {
    client = postgres(env.DATABASE_URL, {
      prepare: false,
    });
    database = drizzle(client, { schema });
  }

  return database as Database;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = undefined;
    database = undefined;
  }
}
