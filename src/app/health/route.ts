import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
