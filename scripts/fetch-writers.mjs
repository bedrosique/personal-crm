import fs from "node:fs";
const query = `SELECT ?person ?score (SAMPLE(?birth) AS ?date) (SAMPLE(?work) AS ?book) (SAMPLE(?place) AS ?birthplace) WHERE { ?person wdt:P31 wd:Q5; wdt:P106 ?occupation; wikibase:sitelinks ?score; wdt:P800 ?work; wdt:P569 ?birth; wdt:P19 ?place. VALUES ?occupation { wd:Q49757 wd:Q6625963 wd:Q4853732 wd:Q214917 } FILTER(?score >= 10) } GROUP BY ?person ?score ORDER BY DESC(?score) LIMIT 1600`;
const r = await fetch(
  "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(query),
  {
    headers: {
      "User-Agent": "PersonalCRMPrototype/1.0 (educational writer dataset)",
    },
    signal: AbortSignal.timeout(90000),
  },
);
if (!r.ok) throw Error("Wikidata query failed: " + r.status);
const data = await r.json();
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(
  "data/candidates.json",
  JSON.stringify(data.results.bindings, null, 2),
);
console.log("Candidates:", data.results.bindings.length);
