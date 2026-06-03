import fs from "fs/promises";

const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
const settingsCsvUrl = process.env.GOOGLE_SETTINGS_CSV_URL;

if (!csvUrl) {
  console.log("GOOGLE_SHEET_CSV_URL is not set. Skipping sheet sync.");
  process.exit(0);
}

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
      if (c === '"') {
        quoted = true;
      } else if (c === ",") {
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

  return rows.filter((r) => r.some((cell) => String(cell || "").trim() !== ""));
}

function isEnabled(value = "") {
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on" || v === "有効";
}

function normalizePlatform(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeId(value = "") {
  return String(value).trim();
}

/* -------------------------
   Streamers Sheet
   Required columns:
   enabled | name | platform | id

   id:
   - twitch  = login name (ex: cakesuzuharu)
   - youtube = channelId  (ex: UCxxxxxxxxxxxxxxxxxxxxxx)
-------------------------- */

const res = await fetch(csvUrl);

if (!res.ok) {
  throw new Error(`Failed to fetch sheet CSV: ${res.status}`);
}

const csv = await res.text();
const rows = parseCSV(csv);

if (!rows.length) {
  throw new Error("Streamers sheet is empty.");
}

const headers = rows.shift().map((h) => h.trim().toLowerCase());

const streamers = rows
  .map((row) => {
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = (row[i] || "").trim();
    });

    return obj;
  })
  .filter((r) => isEnabled(r.enabled || r.enable))
  .map((r) => ({
    name: r.name,
    platform: normalizePlatform(r.platform),
    id: normalizeId(r.id || r.login || r.channelid || r.channel_id || r.url)
  }))
  .filter((r) => r.name && (r.platform === "twitch" || r.platform === "youtube") && r.id);

/* -------------------------
   Settings Sheet
   Required columns:
   key | value

   filterByKeyword | TRUE/FALSE
   keywords        | ADYGTA,ADYGTA2,あでぃよんGTA
-------------------------- */

let filterByKeyword = true;
let keywords = [
  "ADYGTA",
  "ADYGTA2",
  "あでぃよんGTA",
  "adygta",
  "adygta2"
];

if (settingsCsvUrl) {
  const settingsRes = await fetch(settingsCsvUrl);

  if (!settingsRes.ok) {
    throw new Error(`Failed to fetch settings CSV: ${settingsRes.status}`);
  }

  const settingsCsv = await settingsRes.text();
  const settingsRows = parseCSV(settingsCsv);

  if (settingsRows.length > 0) {
    const settingsHeaders = settingsRows
      .shift()
      .map((h) => h.trim().toLowerCase());

    const settings = {};

    settingsRows.forEach((row) => {
      const obj = {};

      settingsHeaders.forEach((h, i) => {
        obj[h] = (row[i] || "").trim();
      });

      if (obj.key) {
        settings[obj.key.trim().toLowerCase()] = (obj.value || "").trim();
      }
    });

    console.log("SETTINGS =", settings);

    if (settings.filterbykeyword !== undefined) {
      filterByKeyword = isEnabled(settings.filterbykeyword);
    }

    if (settings.keywords) {
      keywords = settings.keywords
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
}

/* -------------------------
   Output
-------------------------- */

const output = {
  keywords,
  filterByKeyword,
  streamers
};

await fs.writeFile(
  "data/streamers.json",
  JSON.stringify(output, null, 2) + "\n",
  "utf8"
);

console.log(`synced data/streamers.json (${streamers.length} streamers)`);
