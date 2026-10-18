import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("data/writers.json", "utf8"));
const needs = (s) => !/[\p{Script=Cyrillic}]/u.test(s);
const ids = [
  ...new Set(
    data.writers
      .flatMap((w) => [
        [w.id, w.name],
        [w.workId, w.work],
        [w.placeId, w.place],
      ])
      .filter(([, label]) => needs(label))
      .map(([id]) => id),
  ),
];
const output = "data/writer-localization.json";
const evidence = {
  retrievedAt: new Date().toISOString(),
  policy:
    "Use Russian Wikidata labels or Russian Wikipedia article titles; preserve original when no verified Russian name is available.",
  entities: {},
};
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const q = `SELECT ?item ?label ?article ?title WHERE { VALUES ?item { ${batch.map((id) => "wd:" + id).join(" ")} } OPTIONAL { ?item rdfs:label ?label. FILTER(LANG(?label) = "ru") } OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://ru.wikipedia.org/>; schema:name ?title. } }`;
  let result;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(
        "https://query.wikidata.org/sparql?format=json&query=" +
          encodeURIComponent(q),
        {
          headers: {
            "User-Agent":
              "PersonalCRMPrototype/1.0 (educational writer dataset)",
          },
          signal: AbortSignal.timeout(45000),
        },
      );
      if (r.ok) {
        result = await r.json();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!result) throw Error("Russian label lookup failed");
  for (const r of result.results.bindings) {
    const id = r.item.value.split("/").pop();
    evidence.entities[id] = {
      label: r.label?.value ?? null,
      article: r.article?.value ?? null,
      articleTitle: r.title?.value ?? null,
      source: "https://www.wikidata.org/wiki/" + id,
    };
  }
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
  console.log(
    "Verified localization candidates:",
    Math.min(i + 100, ids.length),
    "/",
    ids.length,
  );
  await new Promise((r) => setTimeout(r, 1000));
}
console.log(
  "Russian labels:",
  Object.values(evidence.entities).filter((e) => e.label).length,
  "Russian articles:",
  Object.values(evidence.entities).filter((e) => e.article).length,
);
