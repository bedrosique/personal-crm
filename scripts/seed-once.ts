import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { contacts } from "../src/db/schema";
import { seedContacts } from "./seed-data";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(73104152)`;
      await tx`create table if not exists crm_bootstrap (name text primary key, completed_at timestamptz not null default now())`;
      const done = await tx`select 1 from crm_bootstrap where name = 'writers-v1'`;
      if (done.length) {
        console.log("Initial seed already completed");
        return;
      }
      if (seedContacts.length !== 1000 || new Set(seedContacts.map(r => r.id)).size !== 1000)
        throw new Error("Invalid seed dataset");
      const db = drizzle(tx as unknown as ReturnType<typeof postgres>);
      const existing = await tx`select 1 from contacts limit 1`;
      if (!existing.length) {
        for (let i = 0; i < seedContacts.length; i += 100)
          await db.insert(contacts).values(seedContacts.slice(i, i + 100));
        console.log("Initial contacts created");
      } else {
        console.log("Existing database preserved without seeding");
      }
      await tx`insert into crm_bootstrap (name) values ('writers-v1')`;
    });
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error("Initial seed failed");
  process.exitCode = 1;
});
