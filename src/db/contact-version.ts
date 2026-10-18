import { sql } from "drizzle-orm";
import { contacts } from "./schema";

// Preserve PostgreSQL microseconds; JavaScript Date would truncate the version.
export const contactVersion = sql<string>`to_char(${contacts.updatedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// A successful write must change the version even if the clock does not advance.
export const nextContactVersion = sql`greatest(clock_timestamp(), ${contacts.updatedAt} + interval '1 microsecond')`;

export function isContactVersion(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
