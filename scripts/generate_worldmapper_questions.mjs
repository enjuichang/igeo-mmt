import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  areAdjacentTopics,
  assertDistinctConcepts,
  normalizeOptionText,
  worldmapperOptionCategory,
  worldmapperSemanticDomain,
  worldmapperSemanticFamily,
  worldmapperSubjectKey,
} from "./question_option_taxonomy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectRoot, "data/worldmapper/maps.json");
const distributionFeaturePath = path.join(projectRoot, "data/worldmapper/distribution-features.json");
const reviewedPath = path.join(projectRoot, "data/questions/questions.json");
const outputPath = path.join(projectRoot, "data/questions/worldmapper-draft-questions.json");
const checkOnly = process.argv.includes("--check");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const distributionFeatures = JSON.parse(fs.readFileSync(distributionFeaturePath, "utf8"));
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

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
  return url.toString();
}

function slugify(value) {
  return normalizeOptionText(value).replace(/\s+/g, "-").slice(0, 72).replace(/-+$/, "");
}

function validateDistributionFeatures() {
  if (
    distributionFeatures.feature_version !== 1 ||
    distributionFeatures.item_count !== manifest.item_count ||
    distributionFeatures.dimensions !== 30 ||
    !Array.isArray(distributionFeatures.items) ||
    distributionFeatures.items.length !== manifest.item_count
  ) {
    throw new Error("Worldmapper distribution-feature artifact is inconsistent");
  }

  const manifestByIndex = new Map(manifest.items.map((item) => [item.index, item]));
  for (const feature of distributionFeatures.items) {
    const item = manifestByIndex.get(feature.index);
    if (!item || item.local_file !== feature.local_file || feature.vector.length !== distributionFeatures.dimensions) {
      throw new Error(`Invalid distribution feature for Worldmapper item ${feature.index}`);
    }
  }
}

validateDistributionFeatures();
const featureByIndex = new Map(distributionFeatures.items.map((item) => [item.index, item.vector]));
const ignoredGeographicWords = new Set([
  "and",
  "democratic",
  "gridded",
  "island",
  "islands",
  "population",
  "republic",
  "saint",
  "states",
  "united",
]);
const geographicReferenceStems = new Set(
  manifest.items
    .filter((item) => /gridded population/i.test(item.name))
    .flatMap((item) => normalizeOptionText(item.name).split(/\s+/))
    .filter((word) => word.length >= 4 && !ignoredGeographicWords.has(word))
    .map((word) => word.slice(0, Math.min(5, word.length))),
);

function distributionSimilarity(left, right) {
  const leftVector = featureByIndex.get(left.index);
  const rightVector = featureByIndex.get(right.index);
  if (!leftVector || !rightVector) throw new Error(`Missing distribution feature for ${left.index} or ${right.index}`);
  return leftVector.reduce((sum, value, index) => sum + value * rightVector[index], 0);
}

function geographicStems(item) {
  return new Set(
    normalizeOptionText(item.name)
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !ignoredGeographicWords.has(word))
      .map((word) => word.slice(0, Math.min(5, word.length)))
      .filter((word) => geographicReferenceStems.has(word)),
  );
}

function geographicAffinity(left, right) {
  const leftStems = geographicStems(left);
  const rightStems = geographicStems(right);
  for (const stem of leftStems) if (rightStems.has(stem)) return 1;
  return 0;
}

function chooseDistractors(item, items) {
  const answerCategory = worldmapperOptionCategory(item);
  const answerDomain = worldmapperSemanticDomain(item);
  const answerFamily = worldmapperSemanticFamily(item);
  const seenSubjects = new Set([worldmapperSubjectKey(item.name)]);
  const usedCategories = new Set([answerCategory]);
  const usedDomains = new Set([answerDomain]);
  const usedFamilies = new Set([answerFamily]);
  const distractors = [];

  const rankedCandidates = items
    .filter((candidate) => candidate.map_page_url !== item.map_page_url)
    .filter((candidate) => !areAdjacentTopics(item, candidate))
    .map((candidate) => {
      const similarity = distributionSimilarity(item, candidate);
      // A shared country/demonym is decisive for local gridded and language
      // maps, whose cropped geometry is not directly comparable with a global
      // cartogram. Otherwise the normalized visual-distribution score decides.
      return { candidate, score: similarity + geographicAffinity(item, candidate) * 1.25 };
    })
    .sort((left, right) => right.score - left.score || left.candidate.index - right.candidate.index);

  for (const { candidate } of rankedCandidates) {
    const category = worldmapperOptionCategory(candidate);
    const domain = worldmapperSemanticDomain(candidate);
    const family = worldmapperSemanticFamily(candidate);
    const subject = worldmapperSubjectKey(candidate.name);
    if (
      !subject ||
      seenSubjects.has(subject) ||
      usedCategories.has(category) ||
      usedDomains.has(domain) ||
      usedFamilies.has(family)
    ) continue;
    if (distractors.some((selected) => areAdjacentTopics(selected, candidate))) continue;
    distractors.push(candidate.name);
    seenSubjects.add(subject);
    usedCategories.add(category);
    usedDomains.add(domain);
    usedFamilies.add(family);
    if (distractors.length === 3) break;
  }

  if (distractors.length !== 3) {
    throw new Error(`Unable to find three unrelated, distribution-matched distractors for ${item.map_page_url}`);
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

  const optionItems = question.Options.map((option) => {
    if (option === question.Answer) return sourceItem;
    return manifest.items.find((item) => normalizeOptionText(item.name) === normalizeOptionText(option));
  });
  const optionDomains = optionItems.map(worldmapperSemanticDomain);
  if (new Set(optionDomains).size !== 4) {
    throw new Error(`Options must represent four distinct semantic domains: ${question["Question ID"]}: ${optionDomains.join(", ")}`);
  }
  const optionFamilies = optionItems.map(worldmapperSemanticFamily);
  if (new Set(optionFamilies).size !== 4) {
    throw new Error(`Options must represent four unrelated semantic families: ${question["Question ID"]}: ${optionFamilies.join(", ")}`);
  }
  for (let left = 0; left < optionItems.length; left += 1) {
    for (let right = left + 1; right < optionItems.length; right += 1) {
      if (areAdjacentTopics(optionItems[left], optionItems[right])) {
        throw new Error(`Options contain adjacent topics: ${question["Question ID"]}: ${question.Options[left]} / ${question.Options[right]}`);
      }
    }
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
