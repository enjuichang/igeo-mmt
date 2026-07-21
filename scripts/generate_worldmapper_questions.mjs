import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertDistinctConcepts,
  normalizeOptionText,
  optionConceptKey,
  worldmapperOptionCategories,
  worldmapperOptionCategory,
} from "./question_option_taxonomy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectRoot, "data/worldmapper/maps.json");
const reviewedPath = path.join(projectRoot, "data/questions/questions.json");
const outputPath = path.join(projectRoot, "data/questions/worldmapper-draft-questions.json");
const checkOnly = process.argv.includes("--check");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let reviewedQuestions = JSON.parse(fs.readFileSync(reviewedPath, "utf8"));
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
const rewriteReviewedOptions = process.argv.includes("--rewrite-reviewed-options");

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

function tokens(value) {
  return new Set(
    normalizeOptionText(value)
      .split(/\s+/)
      .filter((token) => token && !stopWords.has(token)),
  );
}

function slugify(value) {
  return normalizeOptionText(value).replace(/\s+/g, "-").slice(0, 72).replace(/-+$/, "");
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
    categoryOverlap(item, candidate) * -100 -
    titleSimilarity(item, candidate) * 18 -
    Math.min(Math.abs(item.index - candidate.index), 1000) / 1000
  );
}

function chooseDistractors(item, items) {
  const answerCategory = worldmapperOptionCategory(item);
  const seenConcepts = new Set([optionConceptKey(item.name)]);
  const usedCategories = new Set([answerCategory]);
  const categoryOrder = worldmapperOptionCategories.filter((category) => category !== answerCategory);
  const offset = item.index % categoryOrder.length;
  const rotatedCategories = [...categoryOrder.slice(offset), ...categoryOrder.slice(0, offset)];
  const distractors = [];
  for (const category of rotatedCategories) {
    if (usedCategories.has(category)) continue;
    const pool = items
      .filter((candidate) => candidate.map_page_url !== item.map_page_url && worldmapperOptionCategory(candidate) === category)
      .filter((candidate) => {
        const concept = optionConceptKey(candidate.name);
        return concept && !seenConcepts.has(concept);
      })
      .sort((left, right) => {
        const scoreDifference = distractorScore(item, right) - distractorScore(item, left);
        return scoreDifference || left.index - right.index;
      });
    if (!pool.length) continue;
    const candidate = pool[(item.index * 17 + distractors.length * 23) % pool.length];
    distractors.push(candidate.name);
    seenConcepts.add(optionConceptKey(candidate.name));
    usedCategories.add(category);
    if (distractors.length === 3) break;
  }
  if (distractors.length !== 3) {
    throw new Error(`Unable to find three cross-category distractors for ${item.map_page_url}`);
  }
  return distractors;
}

function specificTag(name) {
  const labels = {
    hazards: "Natural hazards",
    health: "Health geography",
    migration: "International migration",
    "culture-identity": "Cultural geography",
    "education-knowledge": "Education and knowledge",
    "sport-leisure": "Sport and leisure geography",
    "agriculture-food": "Agriculture and food",
    "energy-resources": "Energy and resources",
    "environment-climate": "Environmental change",
    "population-demography": "Population geography",
    "economy-work-trade": "Economic geography",
    "politics-conflict": "Political geography",
    "connectivity-transport": "Connectivity and transport",
    "settlement-services": "Settlement and services",
    "tourism-heritage": "Tourism and heritage",
    "general-society": "Thematic geography",
  };
  const category = worldmapperOptionCategory(name);
  return labels[category] ?? "Thematic geography";
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
  assertDistinctConcepts(question.Options, question["Question ID"]);

  const sourceItem = manifest.items.find((item) => normalizeUrl(item.map_page_url) === sourceUrl);
  if (!sourceItem) throw new Error(`Missing source item for ${question["Question ID"]}`);
  const optionCategories = question.Options.map((option) => {
    if (option === question.Answer) return worldmapperOptionCategory(sourceItem);
    const candidate = manifest.items.find((item) => normalizeOptionText(item.name) === normalizeOptionText(option));
    if (!candidate) throw new Error(`Option is not tied to a Worldmapper concept: ${question["Question ID"]}: ${option}`);
    return worldmapperOptionCategory(candidate);
  });
  if (new Set(optionCategories).size !== 4) {
    throw new Error(`Options must represent four distinct conceptual categories: ${question["Question ID"]}: ${optionCategories.join(", ")}`);
  }
}

function rewriteReviewedQuestionOptions() {
  const manifestByUrl = new Map(manifest.items.map((item) => [normalizeUrl(item.map_page_url), item]));
  reviewedQuestions = reviewedQuestions.map((question) => {
    const item = manifestByUrl.get(normalizeUrl(question["Source URL"]));
    if (!item) throw new Error(`Reviewed question is missing from the manifest: ${question["Question ID"]}`);
    const answerPosition = question.Options.indexOf(question.Answer);
    if (answerPosition < 0) throw new Error(`Reviewed answer is invalid: ${question["Question ID"]}`);
    return {
      ...question,
      Options: insertAt(chooseDistractors(item, manifest.items), question.Answer, answerPosition),
    };
  });
  fs.writeFileSync(reviewedPath, `${JSON.stringify(reviewedQuestions, null, 2)}\n`);
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

if (rewriteReviewedOptions) rewriteReviewedQuestionOptions();

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
