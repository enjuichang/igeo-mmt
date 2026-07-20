import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectRoot, "data/worldmapper/maps.json");
const reviewedPath = path.join(projectRoot, "data/questions/questions.json");
const outputPath = path.join(projectRoot, "data/questions/worldmapper-draft-questions.json");
const checkOnly = process.argv.includes("--check");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const reviewedQuestions = JSON.parse(fs.readFileSync(reviewedPath, "utf8"));
const expectedKeys = [
  "Question Name",
  "Question ID",
  "Image/Media source",
  "Source URL",
  "Category/Tags",
  "Options",
  "Answer",
  "Explanation",
];

const promptPatterns = [
  "Which variable is represented by this Worldmapper cartogram?",
  "What does the distorted area pattern in this Worldmapper cartogram represent?",
  "Which title best matches the geographic distribution shown in this cartogram?",
  "Which mapped phenomenon is shown by this Worldmapper resource?",
  "Which indicator is encoded by territory size in this cartogram?",
  "Which description best identifies this Worldmapper cartogram?",
];

const stopWords = new Set([
  "a",
  "all",
  "and",
  "at",
  "between",
  "by",
  "for",
  "from",
  "in",
  "of",
  "per",
  "the",
  "to",
  "total",
  "world",
  "year",
]);

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
  return url.toString();
}

function normalizeText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return new Set(
    normalizeText(value)
      .split(/\s+/)
      .filter((token) => token && !stopWords.has(token)),
  );
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 72).replace(/-+$/, "");
}

function familyFor(name) {
  const normalized = normalizeText(name);
  const families = [
    ["migration-to", /^migration to\b/],
    ["migration-from", /^migration from\b/],
    ["gridded-population", /gridded population/],
    ["language", /\blanguage\b/],
    ["covid", /\bcovid\b|coronavirus/],
    ["earthquake", /\bearthquake/],
    ["nobel-prize", /nobel prize/],
    ["olympic", /\bolympic/],
    ["football", /football|world cup/],
    ["production", /\bproduction\b/],
    ["import", /\bimports?\b/],
    ["export", /\bexports?\b/],
    ["energy", /\bpower\b|electricity|energy/],
    ["emissions", /emissions?|carbon|co2/],
    ["population", /population|births?|deaths?|fertility|mortality/],
    ["education", /education|literacy|school|university/],
    ["health", /health|disease|malaria|cancer|hiv|aids/],
    ["agriculture", /crop|livestock|cattle|chicken|fish|forest/],
    ["connectivity", /internet|mobile|telephone|transport|shipping/],
  ];
  return families.find(([, pattern]) => pattern.test(normalized))?.[0] ?? "general";
}

function categoryOverlap(left, right) {
  const rightCategories = new Set(right.categories ?? []);
  return (left.categories ?? []).filter((category) => rightCategories.has(category)).length;
}

function titleSimilarity(left, right) {
  const leftTokens = tokens(left.name);
  const rightTokens = tokens(right.name);
  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }
  return shared;
}

function distractorScore(item, candidate) {
  return (
    categoryOverlap(item, candidate) * 100 +
    (familyFor(item.name) === familyFor(candidate.name) ? 70 : 0) +
    titleSimilarity(item, candidate) * 18 -
    Math.min(Math.abs(item.index - candidate.index), 1000) / 1000
  );
}

function chooseDistractors(item, items) {
  const seen = new Set([normalizeText(item.name)]);
  const ranked = items
    .filter((candidate) => candidate.map_page_url !== item.map_page_url)
    .sort((left, right) => {
      const scoreDifference = distractorScore(item, right) - distractorScore(item, left);
      return scoreDifference || left.index - right.index;
    });

  const distractors = [];
  for (const candidate of ranked) {
    const normalized = normalizeText(candidate.name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    distractors.push(candidate.name);
    if (distractors.length === 3) break;
  }
  if (distractors.length !== 3) {
    throw new Error(`Unable to find three unique distractors for ${item.map_page_url}`);
  }
  return distractors;
}

function specificTag(name) {
  const labels = {
    "migration-to": "International migration",
    "migration-from": "International migration",
    "gridded-population": "Population distribution",
    language: "Language geography",
    covid: "Public health",
    earthquake: "Natural hazards",
    "nobel-prize": "Education and achievement",
    olympic: "Sport geography",
    football: "Sport geography",
    production: "Production geography",
    import: "International trade",
    export: "International trade",
    energy: "Energy",
    emissions: "Environmental change",
    population: "Population geography",
    education: "Education",
    health: "Health geography",
    agriculture: "Agriculture and resources",
    connectivity: "Connectivity",
    general: "Thematic geography",
  };
  return labels[familyFor(name)];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function insertAt(values, value, index) {
  const result = [...values];
  result.splice(index, 0, value);
  return result;
}

function leastUsedPosition(counts, seed) {
  const minimum = Math.min(...counts);
  const candidates = counts
    .map((count, index) => ({ count, index }))
    .filter(({ count }) => count === minimum)
    .map(({ index }) => index);
  return candidates[seed % candidates.length];
}

function generatedQuestion(item, items, answerPosition) {
  const answer = item.name;
  return {
    "Question Name": promptPatterns[(item.index - 1) % promptPatterns.length],
    "Question ID": `worldmapper-map-${String(item.index).padStart(4, "0")}-${slugify(item.name)}`,
    "Image/Media source": {
      Provider: "Worldmapper",
      "Local path": `data/worldmapper/${item.local_file}`,
      "Image URL": item.image_url,
    },
    "Source URL": item.map_page_url,
    "Category/Tags": unique([
      ...(item.categories ?? []),
      "Worldmapper",
      "Cartogram",
      specificTag(item.name),
    ]),
    Options: insertAt(chooseDistractors(item, items), answer, answerPosition),
    Answer: answer,
    Explanation: `Worldmapper’s source record identifies this cartogram as “${answer}.” Its mapped distribution and labels correspond to that subject; territory size represents the mapped quantity rather than conventional land area. This automatically generated item remains a draft pending educator review of the visible evidence.`,
  };
}

function validateQuestion(question, index, ids, sourceUrls) {
  if (JSON.stringify(Object.keys(question)) !== JSON.stringify(expectedKeys)) {
    throw new Error(`Question ${index + 1} does not use the required top-level schema`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(question["Question ID"])) {
    throw new Error(`Invalid Question ID: ${question["Question ID"]}`);
  }
  if (ids.has(question["Question ID"])) throw new Error(`Duplicate Question ID: ${question["Question ID"]}`);
  ids.add(question["Question ID"]);

  const sourceUrl = normalizeUrl(question["Source URL"]);
  if (sourceUrls.has(sourceUrl)) throw new Error(`Duplicate source URL: ${question["Source URL"]}`);
  sourceUrls.add(sourceUrl);

  const media = question["Image/Media source"];
  if (Object.keys(media).join("|") !== "Provider|Local path|Image URL" || media.Provider !== "Worldmapper") {
    throw new Error(`Invalid media metadata: ${question["Question ID"]}`);
  }
  const localPath = path.join(projectRoot, media["Local path"]);
  if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
    throw new Error(`Missing local media: ${media["Local path"]}`);
  }
  new URL(media["Image URL"]);
  new URL(question["Source URL"]);

  if (!Array.isArray(question["Category/Tags"]) || question["Category/Tags"].length < 3) {
    throw new Error(`Insufficient tags: ${question["Question ID"]}`);
  }
  if (!Array.isArray(question.Options) || question.Options.length !== 4 || new Set(question.Options).size !== 4) {
    throw new Error(`Question must have four unique options: ${question["Question ID"]}`);
  }
  if (question.Options.filter((option) => option === question.Answer).length !== 1) {
    throw new Error(`Answer must match exactly one option: ${question["Question ID"]}`);
  }
}

function buildQuestionBank() {
  if (!Array.isArray(manifest.items) || manifest.items.length !== manifest.item_count) {
    throw new Error("Worldmapper manifest item count is inconsistent");
  }

  const manifestByUrl = new Map(manifest.items.map((item) => [normalizeUrl(item.map_page_url), item]));
  const reviewedByUrl = new Map(reviewedQuestions.map((question) => [normalizeUrl(question["Source URL"]), question]));
  for (const sourceUrl of reviewedByUrl.keys()) {
    if (!manifestByUrl.has(sourceUrl)) throw new Error(`Reviewed question is missing from the manifest: ${sourceUrl}`);
  }

  const answerCounts = [0, 0, 0, 0];
  for (const question of reviewedQuestions) {
    const position = question.Options.indexOf(question.Answer);
    if (position < 0) throw new Error(`Reviewed answer is invalid: ${question["Question ID"]}`);
    answerCounts[position] += 1;
  }

  let generatedCount = 0;
  const questions = manifest.items.map((item) => {
    const reviewed = reviewedByUrl.get(normalizeUrl(item.map_page_url));
    if (reviewed) return reviewed;
    const answerPosition = leastUsedPosition(answerCounts, item.index - 1);
    answerCounts[answerPosition] += 1;
    generatedCount += 1;
    return generatedQuestion(item, manifest.items, answerPosition);
  });

  const ids = new Set();
  const sourceUrls = new Set();
  questions.forEach((question, index) => validateQuestion(question, index, ids, sourceUrls));
  for (const reviewed of reviewedQuestions) {
    const preserved = questions.find(
      (question) => normalizeUrl(question["Source URL"]) === normalizeUrl(reviewed["Source URL"]),
    );
    if (JSON.stringify(preserved) !== JSON.stringify(reviewed)) {
      throw new Error(`Reviewed question changed: ${reviewed["Question ID"]}`);
    }
  }

  const finalAnswerCounts = [0, 0, 0, 0];
  for (const question of questions) finalAnswerCounts[question.Options.indexOf(question.Answer)] += 1;
  return { questions, generatedCount, finalAnswerCounts };
}

const { questions, generatedCount, finalAnswerCounts } = buildQuestionBank();
const serialized = `${JSON.stringify(questions, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outputPath)) throw new Error(`Generated bank does not exist: ${path.relative(projectRoot, outputPath)}`);
  if (fs.readFileSync(outputPath, "utf8") !== serialized) {
    throw new Error("Generated Worldmapper bank is stale; run npm run questions:generate-worldmapper");
  }
} else {
  fs.writeFileSync(outputPath, serialized);
}

console.log(JSON.stringify({
  output: path.relative(projectRoot, outputPath),
  total: questions.length,
  preservedReviewed: reviewedQuestions.length,
  generatedDrafts: generatedCount,
  answerPositions: { A: finalAnswerCounts[0], B: finalAnswerCounts[1], C: finalAnswerCounts[2], D: finalAnswerCounts[3] },
  mode: checkOnly ? "check" : "write",
}, null, 2));
