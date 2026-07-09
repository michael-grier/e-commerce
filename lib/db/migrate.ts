import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { env } from "@/lib/env";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const migrationClient = postgres(env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

try {
  await migrate(drizzle(migrationClient), {
    migrationsFolder: "drizzle",
  });
  console.log("Migrations applied.");
} finally {
  await migrationClient.end();
}
