import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDistinctConcepts } from "./question_option_taxonomy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectRoot, "data/population-pyramids/pyramids.json");
const outputPath = path.join(projectRoot, "data/questions/population-pyramid-draft-questions.json");
const checkOnly = process.argv.includes("--check");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const requiredKeys = [
  "Question Name",
  "Question ID",
  "Question Type",
  "Image/Media source",
  "Source URL",
  "Category/Tags",
  "Options",
  "Answer",
  "Explanation",
];
const optionalKeys = new Set(["Hide media identity", "Option media"]);
const TARGET_QUESTION_COUNT = 300;
const IDENTIFICATION_COUNT = 50;
const SCENARIO_COUNT = 50;

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

function hasTag(item, tag) {
  return item.interesting_tags.includes(tag);
}

function archetype(item) {
  if (hasTag(item, "male-working-age-surplus")) return "male-worker-surplus";
  if (hasTag(item, "fcv-male-deficit-signal")) return "fcv-male-deficit";
  if (hasTag(item, "rapid-aging-profile")) return "aging-heavy";
  if (hasTag(item, "very-young-population")) return "very-young";
  if (hasTag(item, "cohort-notch")) return "cohort-notch";
  if (hasTag(item, "female-longevity-skew")) return "female-longevity";
  if (hasTag(item, "working-age-bulge")) return "working-age-bulge";
  return item.shape_class;
}

function primaryQuestionContent(item, index) {
  if (hasTag(item, "male-working-age-surplus")) {
    return {
      questionType: "special-structure",
      prompt: `Which demographic feature is most evident in ${possessive(item.country)} ${item.year} population pyramid?`,
      answer: "A pronounced surplus of males aged 20–49",
      answerCategory: "working-age-male-surplus",
      distractors: [
        "Children form the largest share of the population",
        "Older adults create the main age-related support pressure",
        "One unusually small cohort suggests a past demographic disruption",
      ],
      distractorCategories: ["youthful-growth", "population-aging", "cohort-disruption"],
      explanation: `The male-to-female ratio at ages 20–49 is ${item.male_to_female_20_49.toFixed(2)} to 1, producing visibly wider male bars through the working ages. A large, male-skewed temporary labour force is a plausible explanation in some economies, but the chart alone cannot establish migration history or employment status.`,
      skillTag: "Sex-structure interpretation",
    };
  }
  if (hasTag(item, "fcv-male-deficit-signal")) {
    return {
      questionType: "special-structure",
      prompt: `Which feature of ${possessive(item.country)} ${item.year} pyramid is a useful lead for further demographic investigation?`,
      answer: "A relative deficit of men aged 20–49",
      answerCategory: "working-age-male-deficit",
      distractors: [
        "A broad base indicates rapidly expanding child cohorts",
        "A narrow base points to long-term population aging",
        "A female surplus appears mainly in the oldest cohorts",
      ],
      distractorCategories: ["youthful-growth", "population-aging", "female-longevity"],
      explanation: `There are ${item.male_to_female_20_49.toFixed(2)} men per woman at ages 20–49. The country is also on the World Bank FY2027 Public FCV List, so conflict, displacement, mortality and migration are reasonable hypotheses to investigate; the pyramid by itself does not establish which process produced the pattern.`,
      skillTag: "Demographic anomaly investigation",
    };
  }
  if (hasTag(item, "rapid-aging-profile")) {
    return {
      questionType: "cause-interpretation",
      prompt: `Which demographic combination could most plausibly contribute to ${possessive(item.country)} narrow base and aging-heavy ${item.year} profile?`,
      answer: "Sustained low fertility together with long life expectancy",
      answerCategory: "population-aging",
      distractors: [
        "A sudden arrival of mostly young male workers",
        "A brief past disruption affecting one narrow age cohort",
        "A survey that omits most people above age 65",
      ],
      distractorCategories: ["worker-migration", "cohort-disruption", "data-coverage"],
      explanation: `People aged 65+ account for ${item.older_share.toFixed(1)}% of the population, while children under 15 account for ${item.children_share.toFixed(1)}%. Long survival and sustained low fertility can generate this structure; housing costs, later family formation and family policy may influence fertility, but those mechanisms require separate evidence.`,
      skillTag: "Demographic-process reasoning",
    };
  }
  if (hasTag(item, "very-young-population")) {
    return {
      questionType: "cause-interpretation",
      prompt: `What is the clearest interpretation of the broad base in ${possessive(item.country)} ${item.year} population pyramid?`,
      answer: "Children form a very large share of the population",
      answerCategory: "youthful-growth",
      distractors: [
        "Working-age men greatly outnumber women",
        "One middle-aged cohort records a temporary past disruption",
        "Women outnumber men mainly among the oldest cohorts",
      ],
      distractorCategories: ["worker-migration", "cohort-disruption", "female-longevity"],
      explanation: `Children under age 15 make up ${item.children_share.toFixed(1)}% of the population. Successively narrower older cohorts create the classic broad-based pyramid associated with a very young and generally fast-growing population. Income, health care, education and fertility can all matter, so the pyramid is evidence of structure rather than proof of one cause.`,
      skillTag: "Age-structure interpretation",
    };
  }
  if (hasTag(item, "cohort-notch")) {
    const cohorts = item.notched_cohorts.map((value) => value.split(" ")[0]).join(", ");
    return {
      questionType: "cause-interpretation",
      prompt: `Why is the notch in ${possessive(item.country)} ${item.year} pyramid demographically interesting?`,
      answer: "It may record an earlier change in births, deaths or migration",
      answerCategory: "cohort-disruption",
      distractors: [
        "It indicates that children dominate the entire population",
        "It reveals a broad working-age male surplus",
        "It shows that older women outnumber older men",
      ],
      distractorCategories: ["youthful-growth", "worker-migration", "female-longevity"],
      explanation: `The ${cohorts} cohort${item.notched_cohorts.length > 1 ? "s are" : " is"} at least 17% smaller than the average of the adjacent cohorts. A notch can preserve the imprint of a birth decline, migration wave, conflict, epidemic or measurement issue, but identifying the cause requires historical and statistical context.`,
      skillTag: "Cohort anomaly interpretation",
    };
  }

  if (hasTag(item, "female-longevity-skew")) {
    return {
      questionType: "special-structure",
      prompt: `Which demographic implication is best supported by the upper ages of ${possessive(item.country)} ${item.year} pyramid?`,
      answer: "Women increasingly outnumber men among the oldest cohorts",
      answerCategory: "female-longevity",
      distractors: [
        "Children form a rapidly expanding share of the population",
        "Temporary male labour migration dominates the working ages",
        "One unusually small cohort records a past demographic disruption",
      ],
      distractorCategories: ["youthful-growth", "worker-migration", "cohort-disruption"],
      explanation: `The female-to-male ratio at ages 65+ is ${item.female_to_male_65_plus.toFixed(2)} to 1, and the female bars become wider at older ages. Longer female survival is a plausible interpretation, although migration and cohort history can also affect the imbalance.`,
      skillTag: "Sex-structure interpretation",
    };
  }

  if (hasTag(item, "working-age-bulge")) {
    return {
      questionType: "demographic-implication",
      prompt: `Which demographic implication is best supported by ${possessive(item.country)} working-age bulge in ${item.year}?`,
      answer: "A large share of the population is currently in the potential labour force",
      answerCategory: "working-age-concentration",
      distractors: [
        "Rapidly expanding child cohorts will dominate near-term school demand",
        "A growing elderly share is the main dependency pressure",
        "One unusually small cohort records a temporary past disruption",
      ],
      distractorCategories: ["youthful-growth", "population-aging", "cohort-disruption"],
      explanation: `${item.working_age_share.toFixed(1)}% of the population is aged 15–64 and the base-to-core ratio is ${item.base_to_core_ratio.toFixed(2)}. This can create a demographic-dividend opportunity, but employment, productivity and dependency outcomes require separate economic evidence.`,
      skillTag: "Demographic-process reasoning",
    };
  }

  if (index % 3 === 0 && item.shape_class === "high-growth-pyramid") {
    return {
      questionType: "cause-interpretation",
      prompt: `Which demographic setting could most plausibly produce ${possessive(item.country)} broad-based ${item.year} pyramid?`,
      answer: "Relatively high fertility and a large share of children",
      answerCategory: "youthful-growth",
      distractors: [
        "A temporary inflow dominated by working-age men",
        "A single past disruption affecting one age cohort",
        "Longer female survival concentrated at older ages",
      ],
      distractorCategories: ["worker-migration", "cohort-disruption", "female-longevity"],
      explanation: `The base-to-core ratio is ${item.base_to_core_ratio.toFixed(2)} and children account for ${item.children_share.toFixed(1)}% of the population. That structure is consistent with comparatively high recent fertility and rapid growth, although development level, mortality and migration should be examined before drawing a causal conclusion.`,
      skillTag: "Demographic-process reasoning",
    };
  }
  if (index % 3 === 1 && item.shape_class === "low-growth-constrictive") {
    return {
      questionType: "cause-interpretation",
      prompt: `Which process is most consistent with the narrow base of ${possessive(item.country)} ${item.year} pyramid?`,
      answer: "Birth cohorts have become smaller than the main working-age cohorts",
      answerCategory: "population-aging",
      distractors: [
        "Temporary male labour migration has widened one side of the pyramid",
        "A single past disruption has created one narrow cohort",
        "Longer female survival appears only among the oldest ages",
      ],
      distractorCategories: ["worker-migration", "cohort-disruption", "female-longevity"],
      explanation: `The average width of cohorts aged 0–14 is ${item.base_to_core_ratio.toFixed(2)} times that of cohorts aged 25–49. A ratio below one indicates smaller recent birth cohorts, often associated with low fertility and possible future aging; economic costs may contribute but cannot be inferred from the chart alone.`,
      skillTag: "Demographic-process reasoning",
    };
  }

  const implications = {
    "high-growth-pyramid": {
      answer: "School enrollment and future job-market entrants are likely to grow rapidly",
      category: "youthful-growth",
      explanation: "The broad base indicates large child cohorts, so education demand and later labour-market entry are likely to expand if the pattern persists.",
    },
    "bullet-column": {
      answer: "Demand is likely to remain comparatively even across child and working-age services",
      category: "stable-age-structure",
      explanation: "Similar cohort widths suggest slower turnover between child and working ages than in a sharply expansive or constrictive profile.",
    },
    "low-growth-constrictive": {
      answer: "A smaller future workforce may need to support a growing older population",
      category: "population-aging",
      explanation: "The narrow base indicates smaller recent cohorts, which can increase aging and workforce-replacement pressure if the pattern persists.",
    },
  };
  const implication = implications[item.shape_class];
  const distractorPool = [
    { text: "Temporary male labour migration is creating a strong working-age sex imbalance", category: "worker-migration" },
    { text: "A past disruption has left one unusually small cohort moving upward through the pyramid", category: "cohort-disruption" },
    { text: "Longer female survival is visible mainly as a female surplus at older ages", category: "female-longevity" },
    { text: "The chart appears to omit a large part of the elderly population", category: "data-coverage" },
  ];
  const selectedDistractors = distractorPool.filter(({ category }) => category !== implication.category).slice(0, 3);
  return {
    questionType: "demographic-implication",
    prompt: `Which planning implication is most consistent with ${possessive(item.country)} ${item.year} age structure?`,
    answer: implication.answer,
    answerCategory: implication.category,
    distractors: selectedDistractors.map(({ text }) => text),
    distractorCategories: selectedDistractors.map(({ category }) => category),
    explanation: `The average width of cohorts aged 0–14 is ${item.base_to_core_ratio.toFixed(2)} times that of cohorts aged 25–49. ${implication.explanation} The pyramid supports an age-structure inference, not a complete forecast of policy outcomes.`,
    skillTag: "Demographic implication",
  };
}

function baseQuestion(item, index, answerPosition) {
  const content = primaryQuestionContent(item, index);
  const choices = insertAt(
    content.distractors.map((text, choiceIndex) => ({ text, category: content.distractorCategories[choiceIndex] })),
    { text: content.answer, category: content.answerCategory },
    answerPosition,
  );
  if (new Set(choices.map(({ category }) => category)).size !== 4) {
    throw new Error(`Base question options must represent four conceptual categories: ${item.country}`);
  }
  return {
    "Question Name": content.prompt,
    "Question ID": `population-pyramid-${item.year}-${String(item.location_code).padStart(3, "0")}-${slugify(item.slug)}`,
    "Question Type": content.questionType,
    "Image/Media source": mediaFor(item),
    "Source URL": item.map_page_url,
    "Category/Tags": questionTags(item, content.skillTag),
    Options: choices.map(({ text }) => text),
    Answer: content.answer,
    Explanation: content.explanation,
  };
}

function mediaFor(item) {
  return {
    Provider: "PopulationPyramid.net",
    "Local path": `data/population-pyramids/${item.local_file}`,
    "Image URL": item.image_url,
  };
}

function questionTags(item, skillTag) {
  return unique([
    "Population",
    "PopulationPyramid.net",
    "Population pyramid",
    item.shape_label,
    item.income_group,
    skillTag,
    ...item.interesting_tag_labels,
  ]);
}

function selectDiverseTargets(items, count, offset = 0) {
  const archetypes = [
    "male-worker-surplus",
    "fcv-male-deficit",
    "aging-heavy",
    "very-young",
    "cohort-notch",
    "female-longevity",
    "working-age-bulge",
    "bullet-column",
    "high-growth-pyramid",
    "low-growth-constrictive",
  ];
  const pools = archetypes.map((type) => items.filter((item) => archetype(item) === type));
  const positions = pools.map((pool) => pool.length ? offset % pool.length : 0);
  const selected = [];
  const used = new Set();
  while (selected.length < count) {
    let madeProgress = false;
    for (let poolIndex = 0; poolIndex < pools.length && selected.length < count; poolIndex += 1) {
      const pool = pools[poolIndex];
      if (!pool.length) continue;
      for (let attempts = 0; attempts < pool.length; attempts += 1) {
        const item = pool[positions[poolIndex] % pool.length];
        positions[poolIndex] += 1;
        if (used.has(item.slug)) continue;
        used.add(item.slug);
        selected.push(item);
        madeProgress = true;
        break;
      }
    }
    if (!madeProgress) break;
  }
  if (selected.length !== count) throw new Error(`Could not select ${count} diverse targets`);
  return selected;
}

const contrastOrders = {
  "male-worker-surplus": ["very-young", "aging-heavy", "bullet-column"],
  "fcv-male-deficit": ["male-worker-surplus", "aging-heavy", "very-young"],
  "aging-heavy": ["very-young", "male-worker-surplus", "high-growth-pyramid"],
  "very-young": ["aging-heavy", "male-worker-surplus", "low-growth-constrictive"],
  "cohort-notch": ["bullet-column", "very-young", "male-worker-surplus"],
  "female-longevity": ["male-worker-surplus", "very-young", "bullet-column"],
  "working-age-bulge": ["very-young", "aging-heavy", "male-worker-surplus"],
  "bullet-column": ["very-young", "aging-heavy", "male-worker-surplus"],
  "high-growth-pyramid": ["aging-heavy", "male-worker-surplus", "bullet-column"],
  "low-growth-constrictive": ["very-young", "male-worker-surplus", "bullet-column"],
};

function contrastingItems(target, seed) {
  const targetType = archetype(target);
  const preferred = contrastOrders[targetType] ?? ["very-young", "aging-heavy", "male-worker-surplus"];
  const selected = [];
  for (let index = 0; index < preferred.length; index += 1) {
    const pool = manifest.items.filter((item) => item.slug !== target.slug && archetype(item) === preferred[index]);
    if (!pool.length) continue;
    const candidate = pool[(seed * 7 + index * 11) % pool.length];
    if (!selected.some((item) => item.slug === candidate.slug)) selected.push(candidate);
  }
  for (const candidate of manifest.items) {
    if (selected.length === 3) break;
    if (candidate.slug !== target.slug && !selected.some((item) => item.slug === candidate.slug) && archetype(candidate) !== targetType) {
      selected.push(candidate);
    }
  }
  if (selected.length !== 3 || new Set(selected.map(archetype)).size !== 3) {
    throw new Error(`Could not create contrasting choices for ${target.country}`);
  }
  return selected;
}

function orderedChoices(target, seed, answerPosition) {
  const choices = insertAt(contrastingItems(target, seed), target, answerPosition);
  if (new Set(choices.map(archetype)).size !== 4) {
    throw new Error(`Pyramid choices must represent four contrasting demographic structures: ${target.country}`);
  }
  return choices;
}

function identificationQuestion(item, index, answerPosition) {
  const choices = orderedChoices(item, index, answerPosition);
  return {
    "Question Name": "The country label has been hidden. Which country or area best matches this 2026 population pyramid?",
    "Question ID": `population-pyramid-identify-${item.year}-${String(item.location_code).padStart(3, "0")}-${slugify(item.slug)}`,
    "Question Type": "country-identification",
    "Hide media identity": true,
    "Image/Media source": mediaFor(item),
    "Source URL": item.map_page_url,
    "Category/Tags": questionTags(item, "Comparative country identification"),
    Options: choices.map((choice) => choice.country),
    Answer: item.country,
    Explanation: `${item.country} is the best match among these deliberately contrasting choices: its pyramid is classified as ${item.shape_label.toLowerCase()}, children account for ${item.children_share.toFixed(1)}%, people aged 65+ account for ${item.older_share.toFixed(1)}%, and the working-age male-to-female ratio is ${item.male_to_female_20_49.toFixed(2)}. A pyramid is not a unique country fingerprint, so this identification is valid only within the four supplied options.`,
  };
}

function scenarioFor(item) {
  const type = archetype(item);
  if (type === "male-worker-surplus") {
    return {
      prompt: "During a field visit, many workers were described as temporary foreign-born migrants, with recruitment strongly concentrated among working-age men. Which pyramid would best fit that observation?",
      explanation: `${item.country} is the best match because its male-to-female ratio at ages 20–49 is ${item.male_to_female_20_49.toFixed(2)}, producing a pronounced male-side bulge. Labour migration is a plausible interpretation of the scenario, but the pyramid alone cannot verify birthplace, visa status or occupation.`,
    };
  }
  if (type === "fcv-male-deficit") {
    return {
      prompt: "A country has experienced conflict and displacement and now has relatively fewer working-age men than women. Which pyramid is most consistent with that description?",
      explanation: `${item.country} has ${item.male_to_female_20_49.toFixed(2)} men per woman at ages 20–49 and appears on the World Bank FY2027 Public FCV List. The visual pattern fits the scenario, but conflict is only a hypothesis: migration, mortality and data quality require independent investigation.`,
    };
  }
  if (type === "aging-heavy") {
    return {
      prompt: "A wealthy society has experienced decades of very low fertility, long life expectancy, later family formation and high housing or childcare costs. Which pyramid would most plausibly match?",
      explanation: `${item.country} is the best visual match: only ${item.children_share.toFixed(1)}% of its population is under 15 while ${item.older_share.toFixed(1)}% is aged 65+. Low fertility and long survival fit the scenario; the role of living costs is plausible but cannot be demonstrated from the pyramid itself.`,
    };
  }
  if (type === "very-young") {
    return {
      prompt: "A lower-income country has high fertility, rapidly expanding school-age cohorts and a very small elderly population. Which pyramid would most plausibly match?",
      explanation: `${item.country} is the best match because children comprise ${item.children_share.toFixed(1)}% of the population and people aged 65+ only ${item.older_share.toFixed(1)}%. The broad base fits a youthful, fast-growing population, but income category alone does not determine fertility or mortality.`,
    };
  }
  if (type === "cohort-notch") {
    const cohorts = item.notched_cohorts.map((value) => value.split(" ")[0]).join(", ");
    return {
      prompt: "Researchers suspect that an earlier disruption briefly reduced births or increased net out-migration, leaving a visible notch that moved upward with age. Which pyramid offers the clearest lead?",
      explanation: `${item.country} contains a detected notch around ${cohorts}, where the cohort is at least 17% smaller than adjacent cohorts. That makes it the best match to investigate, although a birth decline, migration, conflict, epidemic and measurement effects remain competing explanations.`,
    };
  }
  if (type === "female-longevity") {
    return {
      prompt: "A country has high survival into old age, with women increasingly outnumbering men among senior cohorts. Which pyramid would best express that pattern?",
      explanation: `${item.country} is the best match because its female-to-male ratio at ages 65+ is ${item.female_to_male_65_plus.toFixed(2)} to 1. Wider female bars at older ages are consistent with a longevity gap, though migration and cohort history can also influence the imbalance.`,
    };
  }
  if (type === "working-age-bulge") {
    return {
      prompt: "Fertility has fallen after several large birth cohorts, so the population is now concentrated in the working ages rather than at the base. Which pyramid best matches?",
      explanation: `${item.country} is the best match because ${item.working_age_share.toFixed(1)}% of its population is aged 15–64 and the base-to-core ratio is ${item.base_to_core_ratio.toFixed(2)}. The pattern is consistent with a demographic transition, but migration and earlier cohort size also need consideration.`,
    };
  }
  const fallbackPrompts = {
    "high-growth-pyramid": "A country has persistently high fertility and each younger cohort is generally larger than the cohort above it. Which pyramid would most plausibly match?",
    "low-growth-constrictive": "A country has sustained low fertility, smaller child cohorts and growing pressure from population aging. Which pyramid would most plausibly match?",
    "bullet-column": "A country has relatively similar cohort sizes through much of childhood and working age, suggesting slow growth or broad stability. Which pyramid would most plausibly match?",
  };
  return {
    prompt: fallbackPrompts[item.shape_class] ?? fallbackPrompts["bullet-column"],
    explanation: `${item.country} is the best match because its base-to-core ratio is ${item.base_to_core_ratio.toFixed(2)}, which this dataset classifies as ${item.shape_label.toLowerCase()}. The description and shape are consistent, but fertility, mortality and migration should be checked separately before assigning a cause.`,
  };
}

function scenarioQuestion(item, index, answerPosition) {
  const scenario = scenarioFor(item);
  const choices = orderedChoices(item, index + 101, answerPosition);
  return {
    "Question Name": scenario.prompt,
    "Question ID": `population-pyramid-scenario-${item.year}-${String(item.location_code).padStart(3, "0")}-${slugify(item.slug)}`,
    "Question Type": "scenario-match",
    "Image/Media source": mediaFor(item),
    "Option media": choices.map((choice, choiceIndex) => ({
      Label: String.fromCharCode(65 + choiceIndex),
      Country: choice.country,
      "Local path": `data/population-pyramids/${choice.local_file}`,
      "Image URL": choice.image_url,
      "Source URL": choice.map_page_url,
    })),
    "Source URL": item.map_page_url,
    "Category/Tags": questionTags(item, "Scenario-to-pyramid matching"),
    Options: choices.map((choice) => choice.country),
    Answer: item.country,
    Explanation: scenario.explanation,
  };
}

function validateQuestion(question, index, ids) {
  for (const key of requiredKeys) {
    if (!(key in question)) throw new Error(`Question ${index + 1} is missing ${key}`);
  }
  for (const key of Object.keys(question)) {
    if (!requiredKeys.includes(key) && !optionalKeys.has(key)) throw new Error(`Unexpected key ${key}: ${question["Question ID"]}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(question["Question ID"])) throw new Error(`Invalid Question ID: ${question["Question ID"]}`);
  if (ids.has(question["Question ID"])) throw new Error(`Duplicate Question ID: ${question["Question ID"]}`);
  ids.add(question["Question ID"]);

  const media = question["Image/Media source"];
  if (Object.keys(media).join("|") !== "Provider|Local path|Image URL" || media.Provider !== "PopulationPyramid.net") {
    throw new Error(`Invalid media metadata: ${question["Question ID"]}`);
  }
  validateLocalMedia(media["Local path"], question["Question ID"]);
  new URL(media["Image URL"]);
  new URL(question["Source URL"]);
  if (!Array.isArray(question["Category/Tags"]) || question["Category/Tags"].length < 5) throw new Error(`Insufficient tags: ${question["Question ID"]}`);
  if (!Array.isArray(question.Options) || question.Options.length !== 4 || new Set(question.Options).size !== 4) throw new Error(`Question must have four unique options: ${question["Question ID"]}`);
  if (question.Options.filter((option) => option === question.Answer).length !== 1) throw new Error(`Answer must match exactly one option: ${question["Question ID"]}`);
  assertDistinctConcepts(question.Options, question["Question ID"]);
  if (question.Explanation.length < 140) throw new Error(`Explanation is too short: ${question["Question ID"]}`);

  if (question["Question Type"] === "country-identification" && question["Hide media identity"] !== true) {
    throw new Error(`Identification question must hide the label: ${question["Question ID"]}`);
  }
  if (question["Question Type"] === "scenario-match") {
    if (!Array.isArray(question["Option media"]) || question["Option media"].length !== 4) throw new Error(`Scenario needs four pyramid choices: ${question["Question ID"]}`);
    question["Option media"].forEach((option, optionIndex) => {
      if (option.Label !== String.fromCharCode(65 + optionIndex) || option.Country !== question.Options[optionIndex]) throw new Error(`Option media is out of order: ${question["Question ID"]}`);
      validateLocalMedia(option["Local path"], question["Question ID"]);
      new URL(option["Image URL"]);
      new URL(option["Source URL"]);
    });
  } else if ("Option media" in question) {
    throw new Error(`Only scenario questions may contain option media: ${question["Question ID"]}`);
  }
}

function validateLocalMedia(localPath, questionId) {
  const absolutePath = path.join(projectRoot, localPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) throw new Error(`Missing local media for ${questionId}: ${localPath}`);
}

if (!Array.isArray(manifest.items) || manifest.items.length !== manifest.item_count || manifest.item_count !== 200) {
  throw new Error("Population-pyramid manifest item count is inconsistent");
}

const baseQuestions = manifest.items.map((item, index) => baseQuestion(item, index, index % 4));
const identificationTargets = selectDiverseTargets(manifest.items, IDENTIFICATION_COUNT, 0);
const identificationQuestions = identificationTargets.map((item, index) => identificationQuestion(item, index, (baseQuestions.length + index) % 4));
const scenarioTargets = selectDiverseTargets(manifest.items, SCENARIO_COUNT, 3);
const scenarioQuestions = scenarioTargets.map((item, index) => scenarioQuestion(item, index, (baseQuestions.length + identificationQuestions.length + index) % 4));
const questions = [...baseQuestions, ...identificationQuestions, ...scenarioQuestions];

if (questions.length !== TARGET_QUESTION_COUNT) throw new Error(`Expected ${TARGET_QUESTION_COUNT} questions, generated ${questions.length}`);
const ids = new Set();
questions.forEach((question, index) => validateQuestion(question, index, ids));
const distinctSourceUrls = new Set(questions.map((question) => question["Source URL"]));
if (distinctSourceUrls.size !== manifest.item_count) throw new Error(`Expected ${manifest.item_count} represented source pages, found ${distinctSourceUrls.size}`);

const answerCounts = [0, 0, 0, 0];
for (const question of questions) answerCounts[question.Options.indexOf(question.Answer)] += 1;
if (answerCounts.some((count) => count !== TARGET_QUESTION_COUNT / 4)) throw new Error(`Answer positions are not balanced: ${answerCounts.join(", ")}`);
const questionTypes = Object.fromEntries([...new Set(questions.map((question) => question["Question Type"]))].sort().map((type) => [type, questions.filter((question) => question["Question Type"] === type).length]));
const serialized = `${JSON.stringify(questions, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outputPath)) throw new Error(`Generated bank does not exist: ${path.relative(projectRoot, outputPath)}`);
  if (fs.readFileSync(outputPath, "utf8") !== serialized) throw new Error("Generated population-pyramid bank is stale; run npm run questions:generate-population-pyramids");
} else {
  fs.writeFileSync(outputPath, serialized);
}

console.log(JSON.stringify({
  output: path.relative(projectRoot, outputPath),
  total: questions.length,
  representedPyramids: distinctSourceUrls.size,
  questionTypes,
  answerPositions: { A: answerCounts[0], B: answerCounts[1], C: answerCounts[2], D: answerCounts[3] },
  mode: checkOnly ? "check" : "write",
}, null, 2));
