import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { runContactConcurrencyTests } from "../tests/contact-concurrency";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}
async function main() {
  assert.ok(
    fs.existsSync(".next/BUILD_ID"),
    "Run pnpm build before the concurrency test",
  );
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const applicationUrl = new URL(process.env.DATABASE_URL);
  const databaseName =
    "crm_concurrency_test_" + randomUUID().replaceAll("-", "").slice(0, 12);
  assert.match(databaseName, /^crm_concurrency_test_[a-f0-9]{12}$/);
  assert.notEqual(applicationUrl.pathname, "/" + databaseName);
  const testUrl = new URL(applicationUrl);
  testUrl.pathname = "/" + databaseName;
  const application = postgres(applicationUrl.toString(), { max: 1 });
  let isolated: postgres.Sql | undefined;
  let server: ChildProcess | undefined;
  let created = false;
  const fingerprint = async () => {
    const [row] =
      await application`select count(*)::int as count, md5(coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'[]')) as hash from contacts c`;
    return row;
  };
  const before = await fingerprint();
  try {
    await application.unsafe('CREATE DATABASE "' + databaseName + '"');
    created = true;
    isolated = postgres(testUrl.toString(), { max: 5 });
    const [connection] = await isolated`select current_database() as name`;
    assert.equal(connection.name, databaseName);
    await migrate(drizzle(isolated), { migrationsFolder: "drizzle" });
    console.log(
      "Created isolated test database; application database is read-only during this test",
    );
    const port = await freePort();
    const baseUrl = "http://127.0.0.1:" + port;
    server = spawn(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: { ...process.env, DATABASE_URL: testUrl.toString() },
        stdio: "ignore",
        windowsHide: true,
      },
    );
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null)
        throw Error("Isolated Next.js server exited");
      try {
        const response = await fetch(baseUrl, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(500);
    }
    assert.ok(ready, "Isolated server did not become ready");
    await runContactConcurrencyTests(baseUrl, isolated);
  } finally {
    if (server && server.exitCode === null) {
      server.kill();
      await Promise.race([
        new Promise<void>((resolve) => server!.once("exit", () => resolve())),
        pause(3000),
      ]);
    }
    if (isolated) await isolated.end({ timeout: 5 });
    try {
      if (created) {
        assert.match(databaseName, /^crm_concurrency_test_[a-f0-9]{12}$/);
        assert.notEqual(applicationUrl.pathname, "/" + databaseName);
        await application.unsafe(
          'DROP DATABASE "' + databaseName + '" WITH (FORCE)',
        );
        console.log("Removed only the isolated database created by this test");
      }
      assert.deepEqual(
        await fingerprint(),
        before,
        "Application contacts changed during the test",
      );
      console.log(
        "PASS: all existing application contacts and notes are unchanged",
      );
    } finally {
      await application.end();
    }
  }
}
main().catch((error) => {
  let message =
    error instanceof Error ? error.message : "Concurrency test failed";
  if (process.env.DATABASE_URL)
    message = message.replaceAll(
      process.env.DATABASE_URL,
      "[redacted database URL]",
    );
  console.error("FAIL:", message);
  process.exitCode = 1;
});
