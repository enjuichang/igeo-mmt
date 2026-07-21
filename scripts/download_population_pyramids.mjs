import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const YEAR = Number(process.argv.find((arg) => arg.startsWith("--year="))?.split("=")[1] ?? 2026);
const CONCURRENCY = Number(process.argv.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ?? 4);
const FORCE = process.argv.includes("--force");
const ROOT = process.cwd();
const PUBLIC_ROOT = path.join(ROOT, "public", "population-pyramids", String(YEAR));
const DATA_ROOT = path.join(ROOT, "data", "population-pyramids");
const SITE = "https://www.populationpyramid.net";
const IMAGE_SITE = "https://images.populationpyramid.net";
const WORLD_BANK_API = "https://api.worldbank.org/v2/country?format=json&per_page=400";

if (!Number.isInteger(YEAR) || YEAR < 1950 || YEAR > 2100) {
  throw new Error(`Invalid --year value: ${YEAR}`);
}

if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 12) {
  throw new Error(`Invalid --concurrency value: ${CONCURRENCY}`);
}

const SHAPES = {
  high: {
    key: "high-growth-pyramid",
    label: "High-growth pyramid",
    definition: "Broad base: the average 0–14 cohort is at least 15% wider than the average 25–49 cohort.",
  },
  bullet: {
    key: "bullet-column",
    label: "Bullet / column",
    definition: "Near-column or transitional: the base-to-core cohort-width ratio is between 0.80 and 1.15.",
  },
  low: {
    key: "low-growth-constrictive",
    label: "Low-growth / constrictive",
    definition: "Narrow base: the average 0–14 cohort is at least 20% narrower than the average 25–49 cohort.",
  },
};

const INTERESTING_TAGS = {
  "world-bank-fcv-fy2027": {
    label: "World Bank Public FCV list (FY2027)",
    explanation: "The World Bank classifies the country as having geographically widespread organized political violence in its FY2027 Public FCV List.",
  },
  "fcv-male-deficit-signal": {
    label: "FCV context with working-age male deficit",
    explanation: "The country is on the World Bank FY2027 Public FCV List and has fewer than 0.98 men per woman at ages 20–49. This is a research lead, not proof that conflict caused the imbalance.",
  },
  "male-working-age-surplus": {
    label: "Working-age male surplus",
    explanation: "Men outnumber women by at least 1.35:1 at ages 20–49; this is often associated with male-dominated labour migration.",
  },
  "male-working-age-deficit": {
    label: "Working-age male deficit",
    explanation: "Fewer than 0.90 men per woman at ages 20–49; possible causes include conflict, mortality, or sex-selective migration.",
  },
  "male-specific-cohort-dent": {
    label: "Male-specific cohort dent",
    explanation: "A male age cohort is unusually small relative to women of the same age and the adjacent male/female ratios.",
  },
  "cohort-notch": {
    label: "Cohort notch",
    explanation: "A five-year cohort is at least 17% smaller than the average of its adjacent cohorts, suggesting a past shock or birth decline.",
  },
  "working-age-bulge": {
    label: "Working-age bulge",
    explanation: "At least 48% of the population is aged 20–49, a pattern often associated with labour migration or a large prime-age generation.",
  },
  "youth-bulge": {
    label: "Youth bulge",
    explanation: "At least 28% of the population is aged 15–29.",
  },
  "very-young-population": {
    label: "Very young population",
    explanation: "At least 40% of the population is under age 15.",
  },
  "rapid-aging-profile": {
    label: "Aging-heavy profile",
    explanation: "At least 22% is aged 65+ while no more than 16% is under age 15.",
  },
  "female-longevity-skew": {
    label: "Older female surplus",
    explanation: "Women outnumber men by at least 1.65:1 at ages 65+, usually reflecting longevity and cumulative male mortality differences.",
  },
};

const WORLD_BANK_FCV_FY2027 = new Set([
  "afghanistan", "burkina-faso", "cameroon", "central-african-republic",
  "democratic-republic-of-the-congo", "ethiopia", "haiti", "iran-islamic-republic-of",
  "iraq", "lebanon", "libya", "mali", "mozambique", "myanmar", "niger", "nigeria",
  "papua-new-guinea", "somalia", "south-sudan", "sudan", "syrian-arab-republic",
  "ukraine", "state-of-palestine", "yemen",
]);

const NAME_ALIASES = new Map(Object.entries({
  "bahamas": "bahamas the",
  "bolivia plurinational state of": "bolivia",
  "cabo verde": "cabo verde",
  "china hong kong sar": "hong kong sar china",
  "china macao sar": "macao sar china",
  "dem peoples republic of korea": "korea dem peoples rep",
  "democratic republic of the congo": "congo dem rep",
  "congo": "congo rep",
  "czech republic": "czechia",
  "egypt": "egypt arab rep",
  "gambia": "gambia the",
  "iran islamic republic of": "iran islamic rep",
  "kyrgyzstan": "kyrgyz republic",
  "lao peoples democratic republic": "lao pdr",
  "micronesia fed states of": "micronesia fed sts",
  "puerto rico": "puerto rico us",
  "republic of korea": "korea rep",
  "republic of moldova": "moldova",
  "saint kitts and nevis": "st kitts and nevis",
  "saint lucia": "st lucia",
  "saint vincent and the grenadines": "st vincent and the grenadines",
  "sao tome and principe": "sao tome and principe",
  "slovakia": "slovak republic",
  "somalia": "somalia fed rep",
  "state of palestine": "west bank and gaza",
  "swaziland": "eswatini",
  "syrian arab republic": "syrian arab republic",
  "tfyr macedonia": "north macedonia",
  "turkey": "turkiye",
  "united republic of tanzania": "tanzania",
  "united states of america": "united states",
  "united states virgin islands": "virgin islands u s",
  "venezuela bolivarian republic of": "venezuela rb",
  "yemen": "yemen rep",
}));

function normalizeName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

async function fetchWithRetry(url, { attempts = 4, responseType = "json" } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "GeoLens research downloader/1.0" },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      if (responseType === "buffer") return Buffer.from(await response.arrayBuffer());
      if (responseType === "text") return response.text();
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
  }
  throw new Error(`Failed after ${attempts} attempts: ${url}\n${lastError}`);
}

function extractLocations(homepage) {
  const countryLink = /<a class="countryLink" country="(\d+)" slug="([^"]+)"\s+href="[^"]+">([^<]+)<\/a>/g;
  const locations = new Map();
  for (const match of homepage.matchAll(countryLink)) {
    const locationCode = Number(match[1]);
    const slug = decodeHtml(match[2]);
    const name = decodeHtml(match[3].trim());
    // UN M49 country/area codes are below 900. The site uses 900+ for regions.
    if (locationCode >= 900 || slug === "other-non-specified-areas") continue;
    locations.set(locationCode, { locationCode, slug, name });
  }
  return [...locations.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildIncomeLookup(worldBankResponse) {
  const economies = worldBankResponse?.[1] ?? [];
  const lookup = new Map();
  for (const economy of economies) {
    if (economy.region?.id === "NA") continue;
    lookup.set(normalizeName(economy.name), economy);
  }
  return lookup;
}

function findIncome(location, incomeLookup) {
  const normalized = normalizeName(location.name);
  const lookupName = NAME_ALIASES.get(normalized) ?? normalized;
  const match = incomeLookup.get(lookupName);
  if (!match) {
    return {
      incomeGroup: "Not classified",
      incomeGroupCode: "NA",
      worldBankCode: null,
    };
  }
  return {
    incomeGroup: match.incomeLevel?.value || "Not classified",
    incomeGroupCode: match.incomeLevel?.id || "NA",
    worldBankCode: match.id,
  };
}

function classifyShape(data, location) {
  const totals = new Map();
  const male = new Map(data.male.map((cohort) => [cohort.k, cohort.v]));
  const female = new Map(data.female.map((cohort) => [cohort.k, cohort.v]));
  for (const side of [data.male, data.female]) {
    for (const cohort of side) totals.set(cohort.k, (totals.get(cohort.k) ?? 0) + cohort.v);
  }
  const population = [...totals.values()].reduce((sum, value) => sum + value, 0);
  const sum = (keys) => keys.reduce((total, key) => total + (totals.get(key) ?? 0), 0);
  const baseKeys = ["0-4", "5-9", "10-14"];
  const coreKeys = ["25-29", "30-34", "35-39", "40-44", "45-49"];
  const workingKeys = ["15-19", "20-24", ...coreKeys, "50-54", "55-59", "60-64"];
  const primeWorkingKeys = ["20-24", "25-29", "30-34", "35-39", "40-44", "45-49"];
  const youthKeys = ["15-19", "20-24", "25-29"];
  const olderKeys = ["65-69", "70-74", "75-79", "80-84", "85-89", "90-94", "95-99", "100+"];
  const baseAverage = sum(baseKeys) / baseKeys.length;
  const coreAverage = sum(coreKeys) / coreKeys.length;
  const baseToCoreRatio = coreAverage ? baseAverage / coreAverage : 0;
  const shape = baseToCoreRatio >= 1.15 ? SHAPES.high : baseToCoreRatio <= 0.8 ? SHAPES.low : SHAPES.bullet;
  const percent = (value) => Number(((value / population) * 100).toFixed(2));
  const sumSide = (side, keys) => keys.reduce((total, key) => total + (side.get(key) ?? 0), 0);
  const maleToFemale20to49 = sumSide(male, primeWorkingKeys) / sumSide(female, primeWorkingKeys);
  const femaleToMale65Plus = sumSide(female, olderKeys) / sumSide(male, olderKeys);
  const workingAgeBulgeShare = percent(sum(primeWorkingKeys));
  const youthBulgeShare = percent(sum(youthKeys));
  const childrenShare = percent(sum(baseKeys));
  const olderShare = percent(sum(olderKeys));

  const allKeys = data.male.map((cohort) => cohort.k);
  const notchCandidateKeys = allKeys.slice(3, 13);
  const notchedCohorts = [];
  const maleDentCohorts = [];
  for (const key of notchCandidateKeys) {
    const index = allKeys.indexOf(key);
    const previousKey = allKeys[index - 1];
    const nextKey = allKeys[index + 1];
    const neighborAverage = ((totals.get(previousKey) ?? 0) + (totals.get(nextKey) ?? 0)) / 2;
    const depth = neighborAverage ? (totals.get(key) ?? 0) / neighborAverage : 1;
    if (depth <= 0.83) notchedCohorts.push(`${key} (${depth.toFixed(2)})`);

    const ratio = (male.get(key) ?? 0) / (female.get(key) || 1);
    const previousRatio = (male.get(previousKey) ?? 0) / (female.get(previousKey) || 1);
    const nextRatio = (male.get(nextKey) ?? 0) / (female.get(nextKey) || 1);
    const ratioDepth = ratio / ((previousRatio + nextRatio) / 2 || 1);
    if (ratio < 0.95 && ratioDepth <= 0.82) maleDentCohorts.push(`${key} (${ratioDepth.toFixed(2)})`);
  }

  const interestingTags = [];
  if (WORLD_BANK_FCV_FY2027.has(location.slug)) interestingTags.push("world-bank-fcv-fy2027");
  if (WORLD_BANK_FCV_FY2027.has(location.slug) && maleToFemale20to49 < 0.98) interestingTags.push("fcv-male-deficit-signal");
  if (maleToFemale20to49 >= 1.35) interestingTags.push("male-working-age-surplus");
  if (maleToFemale20to49 <= 0.9) interestingTags.push("male-working-age-deficit");
  if (maleDentCohorts.length) interestingTags.push("male-specific-cohort-dent");
  if (notchedCohorts.length) interestingTags.push("cohort-notch");
  if (workingAgeBulgeShare >= 48) interestingTags.push("working-age-bulge");
  if (youthBulgeShare >= 28) interestingTags.push("youth-bulge");
  if (childrenShare >= 40) interestingTags.push("very-young-population");
  if (olderShare >= 22 && childrenShare <= 16) interestingTags.push("rapid-aging-profile");
  if (femaleToMale65Plus >= 1.65) interestingTags.push("female-longevity-skew");
  return {
    shapeClass: shape.key,
    shapeLabel: shape.label,
    baseToCoreRatio: Number(baseToCoreRatio.toFixed(3)),
    childrenShare,
    workingAgeShare: percent(sum(workingKeys)),
    olderShare,
    maleToFemale20to49: Number(maleToFemale20to49.toFixed(3)),
    femaleToMale65Plus: Number(femaleToMale65Plus.toFixed(3)),
    workingAgeBulgeShare,
    youthBulgeShare,
    notchedCohorts,
    maleDentCohorts,
    interestingTags,
    interestingTagLabels: interestingTags.map((key) => INTERESTING_TAGS[key].label),
  };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(records) {
  const columns = [
    "year", "name", "slug", "locationCode", "shapeClass", "shapeLabel", "baseToCoreRatio",
    "childrenShare", "workingAgeShare", "olderShare", "incomeGroup", "incomeGroupCode",
    "worldBankCode", "maleToFemale20to49", "femaleToMale65Plus", "workingAgeBulgeShare",
    "youthBulgeShare", "interestingTags", "interestingTagLabels", "notchedCohorts",
    "maleDentCohorts", "population", "imagePath", "pageUrl", "dataUrl", "imageUrl",
  ];
  return [
    columns.join(","),
    ...records.map((record) => columns.map((key) => csvCell(Array.isArray(record[key]) ? record[key].join("; ") : record[key])).join(",")),
  ].join("\n") + "\n";
}

function markdownReport(records) {
  const shapeOrder = [SHAPES.high, SHAPES.bullet, SHAPES.low];
  const incomeOrder = ["Low income", "Lower middle income", "Upper middle income", "High income", "Not classified"];
  const counts = new Map();
  for (const record of records) {
    const key = `${record.incomeGroup}|${record.shapeClass}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const lines = [
    `# Population pyramids: ${YEAR}`,
    "",
    `${records.length} PopulationPyramid.net country/area images, classified by age-profile shape and paired with the current World Bank income group returned by its API at generation time.`,
    "",
    "## Classification method",
    "",
    ...shapeOrder.flatMap((shape) => [`- **${shape.label}:** ${shape.definition}`]),
    "",
    "The shape is calculated from the population data. Income is a separate descriptive field; it does not determine the shape classification.",
    "",
    "## Counts by income and shape",
    "",
    `| Income group | ${shapeOrder.map((shape) => shape.label).join(" | ")} | Total |`,
    `|---|${shapeOrder.map(() => "---:").join("|")}|---:|`,
  ];
  for (const income of incomeOrder) {
    const values = shapeOrder.map((shape) => counts.get(`${income}|${shape.key}`) ?? 0);
    lines.push(`| ${income} | ${values.join(" | ")} | ${values.reduce((sum, value) => sum + value, 0)} |`);
  }

  lines.push("", "## Countries and areas by pyramid shape", "");
  for (const shape of shapeOrder) {
    const members = records.filter((record) => record.shapeClass === shape.key);
    lines.push(`### ${shape.label} (${members.length})`, "");
    for (const record of members) {
      lines.push(`- ${record.name} — ${record.incomeGroup}`);
    }
    lines.push("");
  }

  lines.push("## Interesting demographic signatures", "");
  lines.push("These tags are screening signals for question discovery. They describe the chart; they do not by themselves prove a cause such as war or labour migration.", "");
  for (const [tagKey, tag] of Object.entries(INTERESTING_TAGS)) {
    const members = records.filter((record) => record.interestingTags.includes(tagKey));
    if (!members.length) continue;
    lines.push(`### ${tag.label} (${members.length})`, "", tag.explanation, "");
    for (const record of members) {
      const detail = tagKey === "male-specific-cohort-dent" ? ` — ${record.maleDentCohorts.join(", ")}`
        : tagKey === "cohort-notch" ? ` — ${record.notchedCohorts.join(", ")}`
        : "";
      lines.push(`- ${record.name} — ${record.incomeGroup}${detail}`);
    }
    lines.push("");
  }

  lines.push(
    "## Sources and reuse",
    "",
    `- Population image and age/sex data: [PopulationPyramid.net](${SITE}/), based on UN World Population Prospects 2024. The downloaded images retain the PopulationPyramid.net credit mark; the site states CC BY 3.0 IGO.`,
    `- Income group: [World Bank Country API](${WORLD_BANK_API.replace(/&/g, "&amp;")}).`,
    "- Conflict/violence context: [World Bank FY2027 Public FCV List](https://thedocs.worldbank.org/en/doc/d2e218e68a25ba7a31147a7455f35cae-0090082026/original/A1-FY27-FCV-List.pdf), effective July 1, 2026.",
    `- Generated ${new Date().toISOString().slice(0, 10)}. Income groups can change between World Bank fiscal years.`,
    ""
  );
  return lines.join("\n");
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

await mkdir(PUBLIC_ROOT, { recursive: true });
await mkdir(DATA_ROOT, { recursive: true });
for (const shape of Object.values(SHAPES)) await mkdir(path.join(PUBLIC_ROOT, shape.key), { recursive: true });

console.log(`Loading country list, 2026 age data, and World Bank income groups…`);
const [homepage, worldBankResponse] = await Promise.all([
  fetchWithRetry(`${SITE}/`, { responseType: "text" }),
  fetchWithRetry(WORLD_BANK_API),
]);
const locations = extractLocations(homepage);
const incomeLookup = buildIncomeLookup(worldBankResponse);
if (locations.length !== 200) throw new Error(`Expected 200 country/area entries, found ${locations.length}.`);

const records = await mapConcurrent(locations, CONCURRENCY, async (location, index) => {
  const pageUrl = `${SITE}/${encodeURIComponent(location.slug)}/${YEAR}/`;
  const dataUrl = `${SITE}/api/pp/${location.locationCode}/${YEAR}/`;
  const captureUrl = `${IMAGE_SITE}/capture/?selector=%23pyramid-share-container&url=${encodeURIComponent(`${pageUrl}?share=true`)}`;
  const data = await fetchWithRetry(dataUrl);
  const shape = classifyShape(data, location);
  const income = findIncome(location, incomeLookup);
  const relativeImagePath = path.posix.join("population-pyramids", String(YEAR), shape.shapeClass, `${location.slug}.png`);
  const imagePath = path.join(ROOT, "public", relativeImagePath);
  if (FORCE || !(await fileExists(imagePath))) {
    const image = await fetchWithRetry(captureUrl, { responseType: "buffer", attempts: 5 });
    if (image.length < 10_000 || image.subarray(1, 4).toString() !== "PNG") {
      throw new Error(`Invalid PNG returned for ${location.name} (${image.length} bytes).`);
    }
    await writeFile(imagePath, image);
  }
  console.log(`[${String(index + 1).padStart(3, "0")}/${locations.length}] ${location.name}`);
  return {
    year: YEAR,
    ...location,
    ...shape,
    ...income,
    population: Math.round(data.population * 1000),
    imagePath: `/${relativeImagePath}`,
    pageUrl,
    dataUrl,
    imageUrl: captureUrl,
  };
});

const jsonPath = path.join(DATA_ROOT, `${YEAR}.json`);
const csvPath = path.join(DATA_ROOT, `${YEAR}.csv`);
const reportPath = path.join(DATA_ROOT, `${YEAR}.md`);
await writeFile(jsonPath, JSON.stringify(records, null, 2) + "\n");
await writeFile(csvPath, toCsv(records));
await writeFile(reportPath, markdownReport(records));

const totals = Object.values(SHAPES).map((shape) => `${shape.label}: ${records.filter((r) => r.shapeClass === shape.key).length}`);
console.log(`Complete: ${records.length} images. ${totals.join("; ")}.`);
console.log(`Manifest: ${path.relative(ROOT, jsonPath)}`);
