import fs from "node:fs";
const path = "data/writers.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
for (let i = 0; i < data.writers.length; i += 100) {
  const batch = data.writers.slice(i, i + 100);
  const q = `SELECT ?person ?date ?precision ?calendar WHERE { VALUES ?person { ${batch.map((r) => "wd:" + r.id).join(" ")} } ?person p:P569 ?statement. ?statement a wikibase:BestRank; psv:P569 ?value. ?value wikibase:timeValue ?date; wikibase:timePrecision ?precision; wikibase:timeCalendarModel ?calendar. }`;
  let d;
  for (let a = 0; a < 5; a++) {
    const r = await fetch(
      "https://query.wikidata.org/sparql?format=json&query=" +
        encodeURIComponent(q),
      {
        headers: { "User-Agent": "PersonalCRMPrototype/1.0" },
        signal: AbortSignal.timeout(90000),
      },
    );
    if (r.ok) {
      d = await r.json();
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!d) throw Error("Date verification failed");
  for (const person of batch) {
    const results = d.results.bindings.filter((r) =>
      r.person.value.endsWith("/" + person.id),
    );
    const dates = [...new Set(results.map((r) => r.date.value))];
    if (dates.length !== 1) {
      person.birth = null;
      person.birthPrecision = null;
      continue;
    }
    const r = results[0];
    person.birth = r.date.value;
    person.birthPrecision = Number(r.precision.value);
    person.birthCalendar = r.calendar.value.split("/").pop();
  }
  console.log("Verified date precision:", i + 100);
}
data.writers = data.writers
  .filter((w) => w.birth && w.birthPrecision >= 9)
  .slice(0, 1000);
if (data.writers.length !== 1000) throw Error("Not enough unambiguous writers");
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Final verified writers:", data.writers.length);
