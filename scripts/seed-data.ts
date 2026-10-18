import { createHash } from "node:crypto";
import dataset from "../data/writers.json";
import localization from "../data/writer-russian-labels.json";
const labels = localization.entities as Record<
  string,
  { value?: string | null }
>;
const displayLabel = (id: string, fallback: string) =>
  labels[id]?.value || fallback;
export const seedId = (id: string) => {
  const hex = createHash("sha256")
    .update("personal-crm-writer-v1:" + id)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const areaCodes = [
  "212",
  "213",
  "312",
  "415",
  "617",
  "202",
  "206",
  "305",
  "404",
  "503",
];
function birthday(w: (typeof dataset.writers)[number]) {
  if (!w.birth) return null;
  const match = w.birth.match(/^(-?\d+)-(\d+)-(\d+)/);
  if (!match) return null;
  const [, year, month, day] = match;
  const era = Number(year) <= 0 ? " до н. э." : "";
  const yearText =
    String(Number(year) <= 0 ? 1 - Number(year) : Number(year)) + era;
  const date =
    w.birthPrecision >= 11
      ? `${day}.${month}.${yearText}`
      : w.birthPrecision === 10
        ? `${month}.${yearText}`
        : yearText;
  return date + (w.birthPrecision >= 10 ? " (григорианский календарь)" : "");
}
export const seedContacts = dataset.writers.map((w, i) => {
  const bucket = (i * 37) % 1000;
  const bioCount = bucket < 300 ? 1 : bucket < 700 ? 2 : 3;
  const bio = [
    birthday(w) ? `Дата рождения: ${birthday(w)}` : null,
    `Известное произведение: «${displayLabel(w.workId, w.work)}»`,
    `Биографический факт: место рождения — ${displayLabel(w.placeId, w.place)}.`,
  ];
  const available = bio.filter((x): x is string => x !== null);
  const selected = Array.from(
    { length: Math.min(bioCount, available.length) },
    (_, j) => available[(j + (i % available.length)) % available.length],
  );
  const contactBucket = (i * 73) % 1000;
  const hasPhone =
    contactBucket < 300 || (contactBucket >= 300 && contactBucket < 500);
  const hasEmail =
    contactBucket < 300 || (contactBucket >= 500 && contactBucket < 700);
  return {
    id: seedId(w.id),
    name: displayLabel(w.id, w.name),
    phone: hasPhone
      ? `+1 ${areaCodes[Math.floor(i / 100)]} 555-${String(100 + (i % 100)).padStart(4, "0")}`
      : null,
    email: hasEmail ? `writer.${w.id.toLowerCase()}@example.com` : null,
    notes: selected.join("\n\n"),
  };
});
