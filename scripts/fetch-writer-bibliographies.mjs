import fs from "node:fs";
const writers = JSON.parse(
  fs.readFileSync("data/writers.json", "utf8"),
).writers.filter((w) => !/[\p{Script=Cyrillic}]/u.test(w.work));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "PersonalCRMPrototype/1.0 (educational writer dataset)",
        },
        signal: AbortSignal.timeout(45000),
      });
      if (response.ok) return await response.json();
    } catch {}
    await pause(10000);
  }
  throw Error("Source unavailable after retries");
}
const metadata = [];
for (let index = 0; index < writers.length; index += 100) {
  const batch = writers.slice(index, index + 100);
  const query = `SELECT ?person ?book ?article ?title ?original WHERE { VALUES (?person ?book) { ${batch.map((w) => `(wd:${w.id} wd:${w.workId})`).join(" ")} } OPTIONAL { ?book wdt:P1476 ?original. } OPTIONAL { ?article schema:about ?person; schema:isPartOf <https://ru.wikipedia.org/>; schema:name ?title. } }`;
  const result = await getJson(
    "https://query.wikidata.org/sparql?format=json&query=" +
      encodeURIComponent(query),
  );
  metadata.push(...result.results.bindings);
}
fs.writeFileSync(
  "artifacts/bibliography-metadata.json",
  JSON.stringify(metadata, null, 2),
);
const titles = [
  ...new Set(metadata.filter((row) => row.title).map((row) => row.title.value)),
];
const cachePath = "artifacts/localization-pages-raw.json";
const pages = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};
for (let index = 0; index < titles.length; index += 25) {
  const batch = titles
    .slice(index, index + 25)
    .filter((title) => !pages[title]?.extract);
  if (!batch.length) continue;
  const data = await getJson(
    "https://ru.wikipedia.org/w/api.php?action=query&format=json&prop=revisions%7Cinfo&rvprop=content&rvslots=main&redirects=1&titles=" +
      encodeURIComponent(batch.join("|")),
  );
  if (!data.query?.pages) throw Error("No bibliography pages returned");
  for (const page of Object.values(data.query.pages)) {
    const text = page.revisions?.[0]?.slots?.main?.["*"];
    if (text)
      pages[page.title] = { extract: text, revision: page.lastrevid ?? null };
  }
  fs.writeFileSync(cachePath, JSON.stringify(pages));
  console.log(
    "Bibliographies checked:",
    Math.min(index + 25, titles.length),
    "/",
    titles.length,
  );
  await pause(3000);
}
const normalize = (text) =>
  text.toLowerCase().normalize("NFC").replace(/[’‘]/g, "'");
const matches = writers.map((writer) => {
  const rows = metadata.filter((row) =>
    row.book.value.endsWith("/" + writer.workId),
  );
  const entry = rows.find((row) => row.title);
  const page = entry ? pages[entry.title.value] : null;
  const originals = [
    ...new Set([
      writer.work,
      ...rows.filter((row) => row.original).map((row) => row.original.value),
    ]),
  ];
  const text = page?.extract ?? "";
  const normalized = normalize(text);
  const excerpts = [];
  for (const original of originals) {
    if (original.length < 4) continue;
    let from = 0;
    for (let count = 0; count < 3; count++) {
      const index = normalized.indexOf(normalize(original), from);
      if (index < 0) break;
      const start = Math.max(0, text.lastIndexOf("\n", index - 1));
      const end = text.indexOf("\n", index);
      excerpts.push(
        text.slice(
          Math.max(start, index - 250),
          Math.min(end < 0 ? text.length : end, index + 250),
        ),
      );
      from = index + original.length;
    }
  }
  return {
    id: writer.workId,
    author: writer.name,
    original: writer.work,
    originalTitles: originals,
    source: entry?.article.value ?? null,
    revision: page?.revision ?? null,
    excerpts: [...new Set(excerpts)],
  };
});
fs.writeFileSync(
  "artifacts/localization-matches.json",
  JSON.stringify(matches, null, 2),
);
console.log(
  "Bibliographies with original title matches:",
  matches.filter((match) => match.excerpts.length).length,
  "/",
  matches.length,
);
