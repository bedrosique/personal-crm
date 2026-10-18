import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    console.log("Migrations applied");
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error("Migration failed");
  process.exitCode = 1;
});
