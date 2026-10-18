import fs from "node:fs";
const path = "data/candidates.json";
const rows = JSON.parse(fs.readFileSync(path, "utf8"));
const books = [...new Set(rows.map((r) => r.book.value.split("/").pop()))];
const literary = new Set();
for (let i = 0; i < books.length; i += 100) {
  const batch = books.slice(i, i + 100);
  const q = `SELECT DISTINCT ?book WHERE { VALUES ?book { ${batch.map((id) => "wd:" + id).join(" ")} } ?book wdt:P31/wdt:P279* wd:Q7725634. }`;
  const r = await fetch(
    "https://query.wikidata.org/sparql?format=json&query=" +
      encodeURIComponent(q),
    {
      headers: {
        "User-Agent": "PersonalCRMPrototype/1.0 (educational writer dataset)",
      },
      signal: AbortSignal.timeout(90000),
    },
  );
  if (!r.ok) throw Error("Literary verification failed: " + r.status);
  const d = await r.json();
  for (const b of d.results.bindings)
    literary.add(b.book.value.split("/").pop());
  console.log(
    "Verified literary works:",
    Math.min(i + 100, books.length),
    "/",
    books.length,
  );
  await new Promise((r) => setTimeout(r, 800));
}
const selected = rows.filter((r) =>
  literary.has(r.book.value.split("/").pop()),
);
if (selected.length < 1100)
  throw Error("Not enough literary candidates: " + selected.length);
fs.writeFileSync(path, JSON.stringify(selected, null, 2));
console.log("Literary candidates:", selected.length);
