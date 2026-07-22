alter table public.questions
add column if not exists igeo_year smallint,
add column if not exists location text,
add column if not exists question_number smallint;

alter table public.questions
add constraint questions_igeo_year_range
check (igeo_year is null or igeo_year between 1996 and 2100),
add constraint questions_question_number_positive
check (question_number is null or question_number > 0);

create index if not exists questions_igeo_edition_idx
on public.questions(igeo_year, location, question_number);

insert into public.question_sources (key, name, url, description, license, attribution) values
  (
    'igeo',
    'International Geography Olympiad',
    'https://geoolympiad.org/document-library/',
    'Official past iGeo Multimedia Test questions and answer sheets.',
    'Official iGeo test material; third-party media rights vary by question',
    'International Geography Olympiad and the contributors named in each test'
  )
on conflict (key) do update set
  name = excluded.name,
  url = excluded.url,
  description = excluded.description,
  license = excluded.license,
  attribution = excluded.attribution;
