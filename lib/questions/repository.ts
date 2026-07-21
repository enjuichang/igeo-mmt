import type {
  CreateQuestionInput,
  PracticeQuestion,
  QuestionFilters,
  QuestionRecord,
} from "./types";

export interface QuestionRepository {
  list(filters?: QuestionFilters): Promise<QuestionRecord[]>;
  getById(id: string): Promise<QuestionRecord | null>;
  create(input: CreateQuestionInput): Promise<QuestionRecord>;
  createMany(inputs: CreateQuestionInput[]): Promise<QuestionRecord[]>;
}

export function toPracticeQuestion(record: QuestionRecord): PracticeQuestion {
  return {
    id: record.id,
    source: record.source.key,
    sourceName: record.source.name,
    sourceUrl: record.source.url,
    topic: record.category,
    tags: record.tags,
    skill: record.skill,
    prompt: record.question,
    options: record.options,
    correct: record.answer.index,
    explanation: record.reasoning,
    difficulty: record.difficulty,
    mediaLink: record.mediaLink,
    mediaAlt: record.mediaAlt,
    optionMedia: record.optionMedia,
    hideMediaIdentity: record.hideMediaIdentity,
    questionType: record.questionType,
    variant: record.visualVariant,
  };
}

export class LocalQuestionRepository implements QuestionRepository {
  constructor(private readonly records: QuestionRecord[]) {}

  async list(filters: QuestionFilters = {}) {
    const results = this.records.filter((record) => {
      if (filters.sources && !filters.sources.includes(record.source.key)) return false;
      if (filters.categories && !filters.categories.includes(record.category)) return false;
      if (filters.difficulties && !filters.difficulties.includes(record.difficulty)) return false;
      if (filters.status && record.status !== filters.status) return false;
      return true;
    });
    return results.slice(0, filters.limit ?? results.length);
  }

  async getById(id: string) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async create(_input: CreateQuestionInput): Promise<QuestionRecord> {
    throw new Error("The local question repository is read-only. Configure Supabase for generated questions.");
  }

  async createMany(_inputs: CreateQuestionInput[]): Promise<QuestionRecord[]> {
    throw new Error("The local question repository is read-only. Configure Supabase for generated questions.");
  }
}
