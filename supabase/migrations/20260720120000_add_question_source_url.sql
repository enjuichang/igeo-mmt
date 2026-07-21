alter table public.questions
add column if not exists source_url text;

update public.questions as questions
set source_url = sources.url
from public.question_sources as sources
where questions.source_url is null
  and sources.key = questions.source_key;

alter table public.questions
alter column source_url set not null;
