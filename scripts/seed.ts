import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { contacts } from "../src/db/schema";
import { seedContacts } from "./seed-data";
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const db = drizzle(sql);
    if (
      seedContacts.length !== 1000 ||
      new Set(seedContacts.map((r) => r.name)).size !== 1000
    )
      throw Error("Invalid dataset");
    await db.transaction(async (tx) => {
      for (let i = 0; i < seedContacts.length; i += 100)
        await tx
          .insert(contacts)
          .values(seedContacts.slice(i, i + 100))
          .onConflictDoNothing({ target: contacts.id });
    });
    const ids = seedContacts.map((r) => r.id);
    const [result] =
      await sql`select count(*)::int as count from contacts where id = any(${ids}::uuid[])`;
    if (result.count !== 1000) throw Error("Seed verification failed");
    console.log("Writer contacts in PostgreSQL:", result.count);
    console.log("Existing contacts and edited notes preserved");
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error("Seed failed; check database and dataset");
  process.exitCode = 1;
});
