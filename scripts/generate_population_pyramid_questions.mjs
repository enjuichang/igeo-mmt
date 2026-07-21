import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectRoot, "data/population-pyramids/pyramids.json");
const outputPath = path.join(projectRoot, "data/questions/population-pyramid-draft-questions.json");
const checkOnly = process.argv.includes("--check");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function insertAt(values, value, index) {
  const result = [...values];
  result.splice(index, 0, value);
  return result;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function possessive(value) {
  return /s$/i.test(value) ? `${value}'` : `${value}'s`;
}

function questionContent(item) {
  const tags = new Set(item.interesting_tags);
  if (tags.has("male-working-age-surplus")) {
    return {
      prompt: `Which demographic feature is most evident in ${possessive(item.country)} ${item.year} population pyramid?`,
      answer: "A pronounced surplus of males aged 20–49",
      distractors: [
        "A pronounced surplus of females aged 20–49",
        "Nearly equal numbers of males and females at every age",
        "A population concentrated mainly above age 80",
      ],
      explanation: `The male-to-female ratio at ages 20–49 is ${item.male_to_female_20_49.toFixed(2)} to 1, producing visibly wider male bars through the working ages. This pattern is often associated with male-dominated labour migration, although the chart alone does not prove the cause.`,
      skillTag: "Sex-structure interpretation",
    };
  }
  if (tags.has("fcv-male-deficit-signal")) {
    return {
      prompt: `Which feature of ${possessive(item.country)} ${item.year} population pyramid is a useful lead for further demographic investigation?`,
      answer: "A working-age male deficit",
      distractors: [
        "A large working-age male surplus",
        "An absence of children under age 15",
        "Equal-sized cohorts from birth to age 100",
      ],
      explanation: `There are ${item.male_to_female_20_49.toFixed(2)} men per woman at ages 20–49. The country is also on the World Bank FY2027 Public FCV List, so conflict, displacement, mortality and migration are reasonable hypotheses to investigate; the pyramid by itself does not establish causation.`,
      skillTag: "Demographic anomaly investigation",
    };
  }
  if (tags.has("rapid-aging-profile")) {
    return {
      prompt: `Which description best matches ${possessive(item.country)} ${item.year} population pyramid?`,
      answer: "A narrow youth base and an aging-heavy population",
      distractors: [
        "A broad youth base and very few older people",
        "A large surplus of working-age males",
        "Identical population shares in every cohort",
      ],
      explanation: `People aged 65+ account for ${item.older_share.toFixed(1)}% of the population, while children under 15 account for ${item.children_share.toFixed(1)}%. The relatively narrow base and wider older cohorts identify an aging-heavy, low-growth profile.`,
      skillTag: "Age-structure interpretation",
    };
  }
  if (tags.has("very-young-population")) {
    return {
      prompt: `What is the clearest interpretation of the broad base in ${possessive(item.country)} ${item.year} population pyramid?`,
      answer: "Children form a very large share of the population",
      distractors: [
        "Older adults form the largest share of the population",
        "The population has no recent births",
        "Women greatly outnumber men at all ages",
      ],
      explanation: `Children under age 15 make up ${item.children_share.toFixed(1)}% of the population. Successively narrower older cohorts create the classic broad-based pyramid associated with a very young and generally fast-growing population.`,
      skillTag: "Age-structure interpretation",
    };
  }
  if (tags.has("cohort-notch")) {
    const cohorts = item.notched_cohorts.map((value) => value.split(" ")[0]).join(", ");
    return {
      prompt: `Which visual feature makes ${possessive(item.country)} ${item.year} population pyramid especially useful for demographic inquiry?`,
      answer: "A noticeable notch in one or more age cohorts",
      distractors: [
        "Every cohort is exactly the same width",
        "Only the population total is shown",
        "There are no differences between males and females",
      ],
      explanation: `The ${cohorts} cohort${item.notched_cohorts.length > 1 ? "s are" : " is"} at least 17% smaller than the average of the adjacent cohorts. Such a notch can record a past birth decline, migration wave or disruptive event, but identifying the cause requires contextual evidence.`,
      skillTag: "Cohort anomaly interpretation",
    };
  }

  const shapeAnswers = {
    "high-growth-pyramid": "A high-growth pyramid with a broad base",
    "bullet-column": "A bullet/column profile with similar cohort widths",
    "low-growth-constrictive": "A low-growth, constrictive profile with a narrow base",
  };
  const answer = shapeAnswers[item.shape_class];
  const distractors = [
    ...Object.entries(shapeAnswers).filter(([key]) => key !== item.shape_class).map(([, value]) => value),
    "A profile dominated by one sex at every age",
  ];
  return {
    prompt: `Which population-pyramid type best describes ${item.country} in ${item.year}?`,
    answer,
    distractors,
    explanation: `The average width of the three cohorts aged 0–14 is ${item.base_to_core_ratio.toFixed(2)} times the average width of the cohorts aged 25–49. Under this dataset's documented thresholds, that is classified as “${item.shape_label}.” The classification is a reproducible screening heuristic rather than an official UN category.`,
    skillTag: "Population-pyramid classification",
  };
}

function generatedQuestion(item, answerPosition) {
  const content = questionContent(item);
  return {
    "Question Name": content.prompt,
    "Question ID": `population-pyramid-${item.year}-${String(item.location_code).padStart(3, "0")}-${slugify(item.slug)}`,
    "Image/Media source": {
      Provider: "PopulationPyramid.net",
      "Local path": `data/population-pyramids/${item.local_file}`,
      "Image URL": item.image_url,
    },
    "Source URL": item.map_page_url,
    "Category/Tags": unique([
      "Population",
      "PopulationPyramid.net",
      "Population pyramid",
      item.shape_label,
      item.income_group,
      content.skillTag,
      ...item.interesting_tag_labels,
    ]),
    Options: insertAt(content.distractors, content.answer, answerPosition),
    Answer: content.answer,
    Explanation: content.explanation,
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
  if (sourceUrls.has(question["Source URL"])) throw new Error(`Duplicate source URL: ${question["Source URL"]}`);
  sourceUrls.add(question["Source URL"]);

  const media = question["Image/Media source"];
  if (Object.keys(media).join("|") !== "Provider|Local path|Image URL" || media.Provider !== "PopulationPyramid.net") {
    throw new Error(`Invalid media metadata: ${question["Question ID"]}`);
  }
  const localPath = path.join(projectRoot, media["Local path"]);
  if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
    throw new Error(`Missing local media: ${media["Local path"]}`);
  }
  new URL(media["Image URL"]);
  new URL(question["Source URL"]);
  if (!Array.isArray(question["Category/Tags"]) || question["Category/Tags"].length < 5) {
    throw new Error(`Insufficient tags: ${question["Question ID"]}`);
  }
  if (!Array.isArray(question.Options) || question.Options.length !== 4 || new Set(question.Options).size !== 4) {
    throw new Error(`Question must have four unique options: ${question["Question ID"]}`);
  }
  if (question.Options.filter((option) => option === question.Answer).length !== 1) {
    throw new Error(`Answer must match exactly one option: ${question["Question ID"]}`);
  }
  if (question.Explanation.length < 100) throw new Error(`Explanation is too short: ${question["Question ID"]}`);
}

if (!Array.isArray(manifest.items) || manifest.items.length !== manifest.item_count || manifest.item_count !== 200) {
  throw new Error("Population-pyramid manifest item count is inconsistent");
}
const answerCounts = [0, 0, 0, 0];
const questions = manifest.items.map((item, index) => {
  const answerPosition = index % 4;
  answerCounts[answerPosition] += 1;
  return generatedQuestion(item, answerPosition);
});
const ids = new Set();
const sourceUrls = new Set();
questions.forEach((question, index) => validateQuestion(question, index, ids, sourceUrls));
const serialized = `${JSON.stringify(questions, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outputPath)) throw new Error(`Generated bank does not exist: ${path.relative(projectRoot, outputPath)}`);
  if (fs.readFileSync(outputPath, "utf8") !== serialized) {
    throw new Error("Generated population-pyramid bank is stale; run npm run questions:generate-population-pyramids");
  }
} else {
  fs.writeFileSync(outputPath, serialized);
}

console.log(JSON.stringify({
  output: path.relative(projectRoot, outputPath),
  total: questions.length,
  generatedDrafts: questions.length,
  answerPositions: { A: answerCounts[0], B: answerCounts[1], C: answerCounts[2], D: answerCounts[3] },
  mode: checkOnly ? "check" : "write",
}, null, 2));
