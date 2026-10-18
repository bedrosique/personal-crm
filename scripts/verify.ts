import "dotenv/config";
import assert from "node:assert/strict";
import postgres from "postgres";
import { seedContacts } from "./seed-data";
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const rows =
      await sql`select * from contacts where id=any(${seedContacts.map((r) => r.id)}::uuid[])`;
    assert.equal(rows.length, 1000);
    assert.equal(new Set(rows.map((r) => r.name)).size, 1000);
    const bio = { one: 0, two: 0, three: 0 };
    const contact = { both: 0, phone: 0, email: 0, neither: 0 };
    for (const r of rows) {
      const count = (
        r.notes.match(
          /Дата рождения:|Известное произведение:|Биографический факт:/g,
        ) || []
      ).length;
      assert.ok(count >= 1 && count <= 3);
      bio[count === 1 ? "one" : count === 2 ? "two" : "three"]++;
      contact[
        r.phone ? (r.email ? "both" : "phone") : r.email ? "email" : "neither"
      ]++;
      if (r.email) assert.match(r.email, /@example\.com$/);
      if (r.phone)
        assert.match(
          r.phone,
          /^\+1 (212|213|312|415|617|202|206|305|404|503) 555-01\d{2}$/,
        );
    }
    assert.deepEqual(bio, { one: 300, two: 400, three: 300 });
    assert.deepEqual(contact, {
      both: 300,
      phone: 200,
      email: 200,
      neither: 300,
    });
    assert.equal(
      new Set(rows.filter((r) => r.email).map((r) => r.email)).size,
      500,
    );
    assert.equal(
      new Set(rows.filter((r) => r.phone).map((r) => r.phone)).size,
      500,
    );
    console.log(
      JSON.stringify(
        {
          writers: rows.length,
          biography: bio,
          contact,
          uniqueEmails: 500,
          uniquePhones: 500,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end();
  }
}
main().catch((e) => {
  console.error("Verification failed:", e.message);
  process.exitCode = 1;
});
