import fs from "node:fs";
const raw = JSON.parse(
  fs.readFileSync("data/writer-localization.json", "utf8"),
);
const reviewPath = "data/writer-title-reviews.json";
const reviews = fs.existsSync(reviewPath)
  ? JSON.parse(fs.readFileSync(reviewPath, "utf8"))
  : {};
const entities = {};
const hasRussian = (value) =>
  typeof value === "string" && /\p{Script=Cyrillic}/u.test(value);
for (const [id, entry] of Object.entries(raw.entities)) {
  let value = hasRussian(entry.label)
    ? entry.label
    : hasRussian(entry.articleTitle)
      ? entry.articleTitle
      : null;
  if (value) {
    value = value.replace(
      / \((?:роман|повесть|пьеса|рассказ|поэма|писатель|поэт)\)$/u,
      "",
    );
    if (id === "Q1530559" && value === "Прилепин, Захар")
      value = "Захар Прилепин";
    entities[id] = {
      value,
      source: hasRussian(entry.label) ? entry.source : entry.article,
      basis: hasRussian(entry.label)
        ? "Russian Wikidata label"
        : "Russian Wikipedia article title",
    };
  }
}
for (const [id, entry] of Object.entries(reviews)) {
  if (!entry.value || !entry.source || !entry.evidence)
    throw Error("Incomplete localization evidence: " + id);
  entities[id] = entry;
}
fs.writeFileSync(
  "data/writer-russian-labels.json",
  JSON.stringify(
    {
      preparedAt: new Date().toISOString(),
      policy:
        "Only attested Russian names and titles; no automatic translation.",
      entities,
    },
    null,
    2,
  ) + "\n",
);
console.log("Verified Russian display labels:", Object.keys(entities).length);
