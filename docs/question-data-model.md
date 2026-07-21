# Question bank architecture

The question bank is a separate domain module. UI components never own question content and do not write directly to Supabase.

```text
app/page.tsx
    │ fetches /api/questions, uses local bank as an offline fallback
    ▼
QuestionRepository interface
    ├── LocalQuestionRepository ── data/questions/*-draft-questions.json
    └── SupabaseQuestionRepository ── public.questions (production)
                                           │
                                           ├── public.question_sources
                                           └── public.question_generation_runs
```

## Canonical record

`lib/questions/types.ts` defines `QuestionRecord`, with these required groups:

- source: key, name, URL, description, licence and attribution
- item: question, exactly four options, answer index/value and reasoning
- media: link, kind and accessible alternative text
- taxonomy: category/tags list, geographic skill and difficulty
- workflow: draft/review/published status, origin and generation run
- audit: stable ID and created/updated timestamps

The `PracticeQuestion` type is only a UI projection. `toPracticeQuestion()` is the explicit boundary between stored records and test rendering.

## Current local workflow

The 40 curated records live in `data/questions/questions.json`, while the runtime generator reads the complete Worldmapper and PopulationPyramid.net draft banks. Each JSON object contains `Question Name`, `Question ID`, `Image/Media source`, `Source URL`, `Category/Tags`, `Options`, `Answer` and `Explanation`. Population-pyramid records additionally identify their question type and may include hidden media identity or four option-level pyramid images. `question-bank.ts` validates and projects those fields into the application model, marking curated records as published/editor-authored and generated records as drafts. Source definitions live independently in `data/questions/sources.ts`. Downloaded source manifests and canonical images remain under `data/worldmapper` and `data/population-pyramids`.

`data/questions/igeo-source.json` tracks whether official past MMT material can be included. It remains disabled while the official document library marks MMT files unavailable or their multimedia cannot be redistributed. This avoids treating public access as permission to republish third-party assessment media.

## Supabase workflow

Apply the ordered migrations under `supabase/migrations/` with
`npm run supabase:push`. They create normalized sources, generation runs and
questions, item-level source URLs, service-role grants, plus constraints for
four unique choices and an answer that matches the selected option.

`npm run supabase:seed` idempotently upserts the complete Worldmapper and
PopulationPyramid.net banks in batches. Reviewed records are published;
generated records remain drafts unless an editor has already published them in
Supabase. Existing publication decisions are preserved across later seed runs. The
production `/api/questions` route uses the RLS-restricted publishable key and
returns published records only.

After an editor has reviewed the complete generated banks, run
`npm run supabase:publish-all` to upsert every question as published. This
explicit command keeps the routine seed's draft-preserving behavior intact.

The intended generation path is:

1. A signed-in user requests a batch from a server route or server action.
2. The server creates a `question_generation_runs` audit row.
3. Approved source adapters freeze data/media and retain attribution.
4. Generated items are validated against `CreateQuestionInput`.
5. A server-only `SupabaseQuestionRepository` inserts them with `origin = generated` and `status = draft`.
6. Editorial review moves acceptable items to `published`; only published questions are available to public clients.

Row-level security permits public reads of source attribution and published
questions. No browser insert policy is provided. The secret/service-role key is
used only by the administrative seed command and must remain outside browser
code and source control.

## Environment variables

- `SUPABASE_URL`: project URL used by the server route and deployment check
- `SUPABASE_PUBLISHABLE_KEY`: RLS-restricted key for published reads
- `SUPABASE_SECRET_KEY`: server-only seeding and future editorial writes

Legacy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` names remain supported for older projects. New
deployments should use the current publishable/secret key pair.

Netlify needs only the URL and publishable key. Its build runs
`npm run deploy:check`, which confirms the schema exists, at least one published
question is publicly readable, and drafts remain private before the Next.js
build can proceed.
