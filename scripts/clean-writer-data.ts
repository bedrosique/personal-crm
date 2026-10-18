import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import originalSeed from "../data/writer-seed-v1.json";
import { seedContacts } from "./seed-data";
const normalize = (value: string) => value.replace(/\r\n/g, "\n");
const bioCount = (notes: string) =>
  (
    notes.match(
      /Дата рождения:|Известное произведение:|Биографический факт:/g,
    ) || []
  ).length;
const generated = new Map(seedContacts.map((row) => [row.id, row]));
const originals = new Map(originalSeed.map((row) => [row.id, row]));
const prohibited =
  /https?:\/\/|^Источники?:|Тестовая карточка|вымышлены|не принадлежат/m;
async function main() {
  assert.equal(seedContacts.length, 1000);
  assert.equal(new Set(seedContacts.map((r) => r.id)).size, 1000);
  assert.equal(new Set(seedContacts.map((r) => r.name)).size, 1000);
  for (const row of seedContacts) {
    const old = originals.get(row.id);
    assert.ok(old);
    assert.equal(row.phone, old.phone);
    assert.equal(row.email, old.email);
    assert.equal(bioCount(row.notes), bioCount(old.notes));
    assert.ok(!prohibited.test(row.notes));
  }
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      const before = await tx`select * from contacts order by id for update`;
      const eligible = before.filter((row) => {
        const old = originals.get(row.id);
        return (
          old &&
          normalize(row.notes) === normalize(old.notes) &&
          row.name === old.name &&
          row.phone === old.phone &&
          row.email === old.email
        );
      });
      const current = before.filter((row) => {
        const next = generated.get(row.id);
        return (
          next &&
          normalize(row.notes) === normalize(next.notes) &&
          row.name === next.name &&
          row.phone === next.phone &&
          row.email === next.email
        );
      });
      const eligibleIds = new Set(eligible.map((r) => r.id));
      const currentIds = new Set(current.map((r) => r.id));
      const protectedRows = before.filter(
        (r) =>
          originals.has(r.id) &&
          !eligibleIds.has(r.id) &&
          !currentIds.has(r.id),
      );
      const changes = eligible.filter((r) => {
        const next = generated.get(r.id)!;
        return (
          r.name !== next.name || normalize(r.notes) !== normalize(next.notes)
        );
      });
      const report = {
        mode: process.argv.includes("--apply") ? "apply" : "preview",
        total: before.length,
        writers: before.filter((r) => originals.has(r.id)).length,
        toUpdate: changes.length,
        alreadyClean: current.length,
        protectedCards: protectedRows.length,
        protectedIds: protectedRows.map((r) => r.id),
        namesToLocalize: changes.filter(
          (r) => r.name !== generated.get(r.id)!.name,
        ).length,
      };
      if (!process.argv.includes("--apply")) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      const folder = path.resolve("artifacts/backups");
      fs.mkdirSync(folder, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(
        folder,
        "writers-cleanup-" + stamp + ".json",
      );
      fs.writeFileSync(
        backupPath,
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            purpose:
              "Before writer note cleanup; contains private contact data",
            rows: before,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx", mode: 0o600 },
      );
      assert.deepEqual(
        JSON.parse(fs.readFileSync(backupPath, "utf8")).rows,
        JSON.parse(JSON.stringify(before)),
      );
      for (const row of changes) {
        const next = generated.get(row.id)!;
        await tx`update contacts set name=${next.name},notes=${next.notes},updated_at=now() where id=${row.id}`;
      }
      const after = await tx`select * from contacts order by id`;
      assert.equal(after.length, before.length);
      assert.deepEqual(
        after.map((r) => r.id),
        before.map((r) => r.id),
      );
      const updatedIds = new Set(changes.map((r) => r.id));
      for (let i = 0; i < before.length; i++) {
        const old = before[i],
          row = after[i];
        assert.equal(row.phone, old.phone);
        assert.equal(row.email, old.email);
        if (!updatedIds.has(row.id)) {
          assert.deepEqual(row, old);
        } else {
          const next = generated.get(row.id)!;
          assert.equal(row.name, next.name);
          assert.equal(row.notes, next.notes);
          assert.equal(bioCount(row.notes), bioCount(old.notes));
          assert.ok(!prohibited.test(row.notes));
        }
      }
      const biography = { one: 0, two: 0, three: 0 };
      for (const row of after.filter((r) => originals.has(r.id))) {
        const count = bioCount(row.notes);
        if (count === 1) biography.one++;
        if (count === 2) biography.two++;
        if (count === 3) biography.three++;
      }
      const result = {
        ...report,
        updated: changes.length,
        phonesAndEmailsPreserved: true,
        protectedCardsPreserved: true,
        biography,
        backupPath,
      };
      fs.writeFileSync(
        backupPath.replace(".json", ".report.json"),
        JSON.stringify(result, null, 2) + "\n",
        { flag: "wx" },
      );
      console.log(JSON.stringify(result, null, 2));
    });
  } finally {
    await sql.end();
  }
}
main().catch((error) => {
  console.error(
    "Writer cleanup aborted; database transaction rolled back:",
    error instanceof assert.AssertionError
      ? "Validation failed"
      : error instanceof Error
        ? error.message
        : "Unknown error",
  );
  process.exitCode = 1;
});
