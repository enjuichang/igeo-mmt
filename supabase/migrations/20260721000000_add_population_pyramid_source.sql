insert into public.question_sources (key, name, url, description, license, attribution) values
  (
    'pyramid',
    'PopulationPyramid.net',
    'https://www.populationpyramid.net/',
    'Age-sex structures based on United Nations World Population Prospects 2024.',
    'CC BY 3.0 IGO as stated by PopulationPyramid.net',
    'PopulationPyramid.net; United Nations World Population Prospects 2024'
  )
on conflict (key) do update set
  name = excluded.name,
  url = excluded.url,
  description = excluded.description,
  license = excluded.license,
  attribution = excluded.attribution;
