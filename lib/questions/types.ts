export type SourceKey =
  | "gapminder"
  | "worldmapper"
  | "usgs"
  | "noaa"
  | "nasa"
  | "worldbank"
  | "gbif"
  | "openmaps";

export type QuestionDifficulty = "foundation" | "intermediate" | "advanced";
export type QuestionStatus = "draft" | "in_review" | "published" | "archived";
export type QuestionOrigin = "seed" | "generated" | "editor";
export type MediaKind = "map" | "cartogram" | "chart" | "satellite" | "photo" | "table" | "video" | "audio";

export type QuestionSource = {
  key: SourceKey;
  name: string;
  url: string;
  description: string;
  license: string;
  attribution: string;
};

/**
 * Canonical storage model. Its field names intentionally mirror the planned
 * Supabase table so UI components never become the source of truth.
 */
export type QuestionRecord = {
  id: string;
  source: QuestionSource;
  question: string;
  options: [string, string, string, string];
  answer: {
    index: 0 | 1 | 2 | 3;
    value: string;
  };
  reasoning: string;
  mediaLink: string;
  mediaKind: MediaKind;
  mediaAlt: string;
  category: string;
  skill: string;
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  origin: QuestionOrigin;
  visualVariant: number;
  createdAt: string;
  updatedAt: string;
  generationRunId: string | null;
};

/** UI-facing projection. Kept separate so the database model can evolve. */
export type PracticeQuestion = {
  id: string;
  source: SourceKey;
  sourceName: string;
  sourceUrl: string;
  topic: string;
  skill: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: QuestionDifficulty;
  mediaLink: string;
  variant: number;
};

export type QuestionFilters = {
  sources?: SourceKey[];
  categories?: string[];
  difficulties?: QuestionDifficulty[];
  status?: QuestionStatus;
  limit?: number;
};

export type CreateQuestionInput = Omit<
  QuestionRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};
