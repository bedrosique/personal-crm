import fs from "node:fs";
const rows = JSON.parse(fs.readFileSync("data/candidates.json", "utf8"));
const ids = [
  ...new Set(
    rows
      .flatMap((r) => [r.person.value, r.book.value, r.birthplace.value])
      .map((v) => v.split("/").pop()),
  ),
];
const cachePath = "data/labels.json";
const labels = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};
const missing = ids.filter((id) => !labels[id]);
for (let i = 0; i < missing.length; i += 200) {
  const batch = missing.slice(i, i + 200);
  const q = `SELECT ?item ?itemLabel WHERE { VALUES ?item { ${batch.map((id) => "wd:" + id).join(" ")} } SERVICE wikibase:label { bd:serviceParam wikibase:language "ru,en". } }`;
  let result;
  for (let a = 0; a < 6; a++) {
    const r = await fetch(
      "https://query.wikidata.org/sparql?format=json&query=" +
        encodeURIComponent(q),
      {
        headers: { "User-Agent": "PersonalCRMPrototype/1.0" },
        signal: AbortSignal.timeout(90000),
      },
    );
    if (r.ok) {
      result = await r.json();
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  if (!result) throw Error("Label query failed");
  for (const r of result.results.bindings)
    labels[r.item.value.split("/").pop()] = r.itemLabel.value;
  fs.writeFileSync(cachePath, JSON.stringify(labels, null, 2));
  console.log(
    "Resolved labels:",
    Math.min(i + 200, missing.length),
    "/",
    missing.length,
  );
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
const id = (v) => v.split("/").pop();
const unique = rows
  .map((r) => ({
    id: id(r.person.value),
    name: labels[id(r.person.value)],
    birth: r.date.value,
    work: labels[id(r.book.value)],
    workId: id(r.book.value),
    place: labels[id(r.birthplace.value)],
    placeId: id(r.birthplace.value),
    score: Number(r.score.value),
  }))
  .filter(
    (r) =>
      r.name &&
      r.work &&
      r.place &&
      !/^Q\d+$/.test(r.name) &&
      !/^Q\d+$/.test(r.work) &&
      !/^Q\d+$/.test(r.place),
  )
  .filter(
    (r, i, all) =>
      all.findIndex(
        (x) => x.name.toLocaleLowerCase() === r.name.toLocaleLowerCase(),
      ) === i,
  )
  .slice(0, 1500);
if (unique.length < 1000) throw Error("Not enough writers: " + unique.length);
fs.writeFileSync(
  "data/writers.json",
  JSON.stringify(
    {
      source: "https://www.wikidata.org/",
      retrievedAt: new Date().toISOString(),
      license: "CC0",
      writers: unique,
    },
    null,
    2,
  ),
);
console.log("Saved writers:", unique.length);
