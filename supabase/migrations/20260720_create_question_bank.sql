create extension if not exists pgcrypto;

create type public.question_difficulty as enum ('foundation', 'intermediate', 'advanced');
create type public.question_status as enum ('draft', 'in_review', 'published', 'archived');
create type public.question_origin as enum ('seed', 'generated', 'editor');
create type public.question_media_kind as enum ('map', 'cartogram', 'chart', 'satellite', 'photo', 'table', 'video', 'audio');
create type public.generation_run_status as enum ('running', 'completed', 'failed');

create table public.question_sources (
  key text primary key,
  name text not null,
  url text not null,
  description text not null,
  license text not null,
  attribution text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_generation_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete set null,
  source_keys text[] not null default '{}',
  prompt_version text not null,
  model text,
  status public.generation_run_status not null default 'running',
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.questions (
  id text primary key default gen_random_uuid()::text,
  source_key text not null references public.question_sources(key) on update cascade,
  question text not null check (length(trim(question)) > 0),
  options text[] not null check (cardinality(options) = 4),
  answer_index smallint not null check (answer_index between 0 and 3),
  answer text not null,
  reasoning text not null check (length(trim(reasoning)) > 0),
  media_link text not null,
  media_kind public.question_media_kind not null,
  media_alt text not null,
  category text not null,
  tags text[] not null default '{}',
  skill text not null,
  difficulty public.question_difficulty not null,
  status public.question_status not null default 'draft',
  origin public.question_origin not null default 'generated',
  visual_variant integer not null default 0,
  generation_run_id uuid references public.question_generation_runs(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answer_matches_option check (answer = options[answer_index + 1]),
  constraint options_are_nonempty check (
    length(trim(options[1])) > 0 and length(trim(options[2])) > 0 and
    length(trim(options[3])) > 0 and length(trim(options[4])) > 0
  ),
  constraint options_are_unique check (
    options[1] <> options[2] and options[1] <> options[3] and options[1] <> options[4] and
    options[2] <> options[3] and options[2] <> options[4] and options[3] <> options[4]
  )
);

create index questions_source_key_idx on public.questions(source_key);
create index questions_status_idx on public.questions(status);
create index questions_category_difficulty_idx on public.questions(category, difficulty);
create index questions_generation_run_idx on public.questions(generation_run_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger question_sources_set_updated_at
before update on public.question_sources
for each row execute function public.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

alter table public.question_sources enable row level security;
alter table public.question_generation_runs enable row level security;
alter table public.questions enable row level security;

create policy "Anyone can read source attribution"
on public.question_sources for select
using (true);

create policy "Anyone can read published questions"
on public.questions for select
using (status = 'published');

grant select on public.question_sources to anon, authenticated;
grant select on public.questions to anon, authenticated;

comment on table public.questions is
  'Reviewed iGEO-style question bank. Server-generated rows begin as drafts and require editorial publication.';
comment on table public.question_generation_runs is
  'Server-side audit trail for batches of generated draft questions.';

insert into public.question_sources (key, name, url, description, license, attribution) values
  ('gapminder', 'Gapminder', 'https://www.gapminder.org/data/', 'Development indicators, time series and teaching data.', 'CC BY 4.0 for Systema Globalis; underlying sources may add requirements', 'Gapminder and the named underlying data provider'),
  ('worldmapper', 'Worldmapper', 'https://worldmapper.org/', 'World cartograms resized by social and environmental totals.', 'CC BY-NC-SA 4.0', 'Worldmapper'),
  ('usgs', 'USGS', 'https://earthquake.usgs.gov/fdsnws/event/1/', 'Earthquake magnitude, depth, location and event sequences.', 'Generally U.S. public domain; verify third-party items', 'U.S. Geological Survey'),
  ('noaa', 'NOAA NCEI', 'https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation', 'Station records, climate normals and seasonal observations.', 'U.S. government data; preserve dataset and station metadata', 'NOAA National Centers for Environmental Information'),
  ('nasa', 'NASA GIBS', 'https://nasa-gibs.github.io/gibs-api-docs/', 'Tiled satellite imagery for environmental change and hazards.', 'NASA media guidance and dataset-specific acknowledgements', 'NASA Global Imagery Browse Services (GIBS), part of ESDIS'),
  ('worldbank', 'World Bank', 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation', 'Development, population, urbanisation and inequality indicators.', 'CC BY 4.0 unless a dataset states otherwise', 'World Bank and the named indicator provider'),
  ('gbif', 'GBIF', 'https://techdocs.gbif.org/en/openapi/v1/occurrence', 'Species occurrence records and biodiversity distributions.', 'Dataset-specific CC0, CC BY or CC BY-NC', 'GBIF and each contributing occurrence dataset'),
  ('openmaps', 'Open map media', 'https://www.naturalearthdata.com/about/terms-of-use/', 'Natural Earth, OpenStreetMap and licensed Wikimedia media.', 'Provider-specific: public domain, ODbL or Creative Commons', 'Preserve the attribution required by the selected provider')
on conflict (key) do update set
  name = excluded.name,
  url = excluded.url,
  description = excluded.description,
  license = excluded.license,
  attribution = excluded.attribution;
