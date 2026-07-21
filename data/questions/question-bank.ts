import { toPracticeQuestion } from "@/lib/questions/repository";
import type { QuestionRecord } from "@/lib/questions/types";
import populationPyramidQuestions from "./population-pyramid-draft-questions.json";
import reviewedQuestions from "./questions.json";
import { sourceRegistry } from "./sources";
import worldmapperQuestions from "./worldmapper-draft-questions.json";

type JsonQuestion = {
  "Question Name": string;
  "Question ID": string;
  "Image/Media source": {
    Provider: "Worldmapper" | "PopulationPyramid.net";
    "Local path": string;
    "Image URL": string;
  };
  "Source URL": string;
  "Category/Tags": string[];
  Options: [string, string, string, string];
  Answer: string;
  Explanation: string;
};

const questions = [
  ...(worldmapperQuestions as JsonQuestion[]),
  ...(populationPyramidQuestions as JsonQuestion[]),
];
const reviewedIds = new Set((reviewedQuestions as JsonQuestion[]).map((item) => item["Question ID"]));
const SEED_TIMESTAMP = "2026-07-20T00:00:00.000Z";

function publicPopulationPyramidPath(localPath: string) {
  return localPath.replace(/^data\/population-pyramids\/images\//, "/population-pyramids/");
}

/**
 * The JSON file is the editorial source of truth. This adapter only projects
 * its human-readable field names into the application's canonical model.
 */
export const questionRecords: QuestionRecord[] = questions.map((item, index) => {
  const answerIndex = item.Options.indexOf(item.Answer);
  const reviewed = reviewedIds.has(item["Question ID"]);
  const isPopulationPyramid = item["Image/Media source"].Provider === "PopulationPyramid.net";
  const sourceDefinition = isPopulationPyramid ? sourceRegistry.pyramid : sourceRegistry.worldmapper;
  const hasAnomalyTag = item["Category/Tags"].some((tag) =>
    [
      "Sex-structure interpretation",
      "Demographic anomaly investigation",
      "Cohort anomaly interpretation",
    ].includes(tag),
  );
  if (answerIndex < 0 || answerIndex > 3) {
    throw new Error(`Answer is not one of the four options: ${item["Question ID"]}`);
  }

  return {
    id: item["Question ID"],
    source: {
      ...sourceDefinition,
      url: item["Source URL"],
    },
    question: item["Question Name"],
    options: item.Options,
    answer: {
      index: answerIndex as 0 | 1 | 2 | 3,
      value: item.Answer,
    },
    reasoning: item.Explanation,
    mediaLink: isPopulationPyramid
      ? publicPopulationPyramidPath(item["Image/Media source"]["Local path"])
      : item["Image/Media source"]["Image URL"],
    mediaKind: isPopulationPyramid ? "chart" : "cartogram",
    mediaAlt: isPopulationPyramid
      ? "Population pyramid showing the selected country or area's 2026 population by age group and sex"
      : `Worldmapper cartogram representing ${item.Answer.toLowerCase()}`,
    category: item["Category/Tags"][0] ?? "Uncategorized",
    tags: item["Category/Tags"],
    skill: isPopulationPyramid ? "Population-pyramid interpretation" : "Cartogram interpretation",
    difficulty: isPopulationPyramid && hasAnomalyTag ? "intermediate" : "foundation",
    status: reviewed ? "published" : "draft",
    origin: reviewed ? "editor" : "generated",
    visualVariant: index,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    generationRunId: null,
  };
});

export const practiceQuestionBank = questionRecords.map(toPracticeQuestion);
