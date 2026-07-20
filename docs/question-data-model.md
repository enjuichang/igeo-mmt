# Question bank architecture

The question bank is a separate domain module. UI components never own question content and do not write directly to Supabase.

```text
app/page.tsx
    │ uses PracticeQuestion
    ▼
QuestionRepository interface
    ├── LocalQuestionRepository ── data/questions/question-bank.ts (current)
    └── SupabaseQuestionRepository ── public.questions (planned)
                                           │
                                           ├── public.question_sources
                                           └── public.question_generation_runs
```

## Canonical record

`lib/questions/types.ts` defines `QuestionRecord`, with these required groups:

- source: key, name, URL, description, licence and attribution
- item: question, exactly four options, answer index/value and reasoning
- media: link, kind and accessible alternative text
- taxonomy: category, geographic skill and difficulty
- workflow: draft/review/published status, origin and generation run
- audit: stable ID and created/updated timestamps

The `PracticeQuestion` type is only a UI projection. `toPracticeQuestion()` is the explicit boundary between stored records and test rendering.

## Current local workflow

Curated records live in `data/questions/question-bank.ts`. Source definitions live independently in `data/questions/sources.ts`. The local repository is intentionally read-only, preventing browser-generated questions from being mistaken for reviewed content.

## Supabase workflow

Apply `supabase/migrations/20260720_create_question_bank.sql` when a Supabase project is available. It creates normalized sources, generation runs and questions, plus constraints for four unique choices and an answer that matches the selected option.

The intended generation path is:

1. A signed-in user requests a batch from a server route or server action.
2. The server creates a `question_generation_runs` audit row.
3. Approved source adapters freeze data/media and retain attribution.
4. Generated items are validated against `CreateQuestionInput`.
5. A server-only `SupabaseQuestionRepository` inserts them with `origin = generated` and `status = draft`.
6. Editorial review moves acceptable items to `published`; only published questions are available to public clients.

Row-level security permits public reads of source attribution and published questions. No browser insert policy is provided. The service-role key must remain in server-only code.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe key for published reads
- `SUPABASE_SERVICE_ROLE_KEY`: server-only generation and editorial writes

The Supabase package is deliberately not installed yet. When connecting the project, create browser/server clients in a separate infrastructure module and inject the server client into `SupabaseQuestionRepository`.
