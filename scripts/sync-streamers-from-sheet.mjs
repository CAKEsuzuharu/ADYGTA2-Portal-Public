import fs from "fs/promises";

const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;

if (!csvUrl) {
  console.log("GOOGLE_SHEET_CSV_URL is not set. Skipping sheet sync.");
  process.exit(0);
}

const res = await fetch(csvUrl);
if (!res.ok) {
  throw new Error(`Failed to fetch sheet CSV: ${res.status}`);
}

const csv = await res.text();

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (quoted) {
      if (c === '"' && n === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') quoted = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c !== "\r") {
        cell += c;
      }
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

const rows = parseCSV(csv);
const headers = rows.shift().map((h) => h.trim().toLowerCase());

const streamers = rows
  .map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] || "").trim();
    });
    return obj;
  })
  .filter((r) => {
    const enabled = String(r.enabled || "").toLowerCase();
    return enabled === "true" || enabled === "1" || enabled === "yes" || enabled === "on";
  })
  .filter((r) => r.name && r.platform && r.url)
  .map((r) => ({
    name: r.name,
    platform: r.platform.toLowerCase(),
    url: r.url
  }));

const output = {
  keywords: ["ADYGTA", "ADYGTA2", "あでぃよんGTA", "adygta", "adygta2"],
  filterByKeyword: true,
  streamers
};

await fs.writeFile("data/streamers.json", JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(`synced data/streamers.json (${streamers.length} streamers)`);