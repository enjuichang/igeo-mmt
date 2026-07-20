import type {
  CreateQuestionInput,
  MediaKind,
  QuestionDifficulty,
  QuestionFilters,
  QuestionOrigin,
  QuestionRecord,
  QuestionStatus,
  SourceKey,
} from "./types";
import type { QuestionRepository } from "./repository";

type QueryResult = { data: unknown; error: { message: string } | null };
type SupabaseQuery = PromiseLike<QueryResult> & {
  select(columns?: string): SupabaseQuery;
  eq(column: string, value: unknown): SupabaseQuery;
  in(column: string, values: unknown[]): SupabaseQuery;
  limit(value: number): SupabaseQuery;
  insert(rows: unknown[]): SupabaseQuery;
  maybeSingle(): Promise<QueryResult>;
};

/** Minimal client contract keeps @supabase/supabase-js optional for now. */
export type SupabaseLikeClient = {
  from(table: "questions"): SupabaseQuery;
};

type DatabaseRow = {
  id: string;
  source_key: SourceKey;
  question: string;
  options: [string, string, string, string];
  answer_index: 0 | 1 | 2 | 3;
  answer: string;
  reasoning: string;
  media_link: string;
  media_kind: MediaKind;
  media_alt: string;
  category: string;
  skill: string;
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  origin: QuestionOrigin;
  visual_variant: number;
  generation_run_id: string | null;
  created_at: string;
  updated_at: string;
  question_sources: {
    key: SourceKey;
    name: string;
    url: string;
    description: string;
    license: string;
    attribution: string;
  };
};

const QUESTION_SELECT = "*, question_sources(*)";

function toRecord(value: unknown): QuestionRecord {
  const row = value as DatabaseRow;
  return {
    id: row.id,
    source: row.question_sources,
    question: row.question,
    options: row.options,
    answer: { index: row.answer_index, value: row.answer },
    reasoning: row.reasoning,
    mediaLink: row.media_link,
    mediaKind: row.media_kind,
    mediaAlt: row.media_alt,
    category: row.category,
    skill: row.skill,
    difficulty: row.difficulty,
    status: row.status,
    origin: row.origin,
    visualVariant: row.visual_variant,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    generationRunId: row.generation_run_id,
  };
}

function toDatabaseRow(input: CreateQuestionInput) {
  return {
    id: input.id,
    source_key: input.source.key,
    question: input.question,
    options: input.options,
    answer_index: input.answer.index,
    answer: input.answer.value,
    reasoning: input.reasoning,
    media_link: input.mediaLink,
    media_kind: input.mediaKind,
    media_alt: input.mediaAlt,
    category: input.category,
    skill: input.skill,
    difficulty: input.difficulty,
    status: input.status,
    origin: input.origin,
    visual_variant: input.visualVariant,
    generation_run_id: input.generationRunId,
  };
}

/**
 * Server-side Supabase adapter skeleton. Wire this to a service-role client in
 * a server route; never expose the service key in the browser.
 */
export class SupabaseQuestionRepository implements QuestionRepository {
  constructor(private readonly client: SupabaseLikeClient) {}

  async list(filters: QuestionFilters = {}): Promise<QuestionRecord[]> {
    let query = this.client.from("questions").select(QUESTION_SELECT);
    if (filters.sources) query = query.in("source_key", filters.sources);
    if (filters.categories) query = query.in("category", filters.categories);
    if (filters.difficulties) query = query.in("difficulty", filters.difficulties);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Unable to load questions: ${error.message}`);
    return Array.isArray(data) ? data.map(toRecord) : [];
  }

  async getById(id: string): Promise<QuestionRecord | null> {
    const { data, error } = await this.client
      .from("questions")
      .select(QUESTION_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Unable to load question: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async create(input: CreateQuestionInput): Promise<QuestionRecord> {
    const [created] = await this.createMany([input]);
    return created;
  }

  async createMany(inputs: CreateQuestionInput[]): Promise<QuestionRecord[]> {
    const { data, error } = await this.client
      .from("questions")
      .insert(inputs.map(toDatabaseRow))
      .select(QUESTION_SELECT);
    if (error) throw new Error(`Unable to store generated questions: ${error.message}`);
    return Array.isArray(data) ? data.map(toRecord) : [];
  }
}
