# GeoLens — iGEO Multimedia Test practice generator

GeoLens is a research-backed website prototype for generating source-verified, iGEO-style Multimedia Test (MMT) practice. It turns maps, cartograms, charts, satellite imagery and public geographic datasets into short four-option interpretation questions.

The project is independent and educational. It is not affiliated with, endorsed by, or an official product of the International Geography Olympiad.

## What is implemented

- A polished responsive generator and timed test-taking experience
- 40 reviewed Worldmapper crop-cartogram questions stored as JSON
- Closely related distractors within the same agricultural product family
- Configurable 5 or 10-question practice tests with per-item pacing
- A 40-question mock exam with a 30-minute default and adjustable 20-60 minute countdown
- An official iGEO past-question source option with live availability and reuse-status messaging
- 45, 60 or 75-second pacing per question
- Four-option answer selection, scoring, explanations and source verification links
- Visual resource renderers for cartograms, scatter plots, climate bars, satellite imagery, occurrence maps and indicator tables
- Explicit attribution for the Worldmapper cartogram included in the prototype
- A source registry designed to keep provenance and reuse constraints attached to every question
- A question-bank domain separated from the website, with a repository interface and Supabase-ready schema

The current version uses curated, source-backed templates rather than automatically publishing unreviewed questions from live APIs. This is deliberate: live data can change after an answer key is generated, and remote media often has item-level licensing requirements. The architecture section below describes the intended reviewed-ingestion pipeline.

## Research findings

### Official MMT structure

The [iGEO Test Guidelines](https://geoolympiad.org/guidelines/) define the MMT as:

- 40 questions
- Approximately 1–2 minutes per question, depending on resource complexity
- Four multiple-choice answers with one correct answer
- A resource attached to every question, such as a map, photo, diagram, chart, graph, video or audio recording
- Contemporary and applied geography spanning physical and human geography
- 20% of the overall iGEO score; the Written Response Test and Fieldwork Exercise are each worth 40%

The guidelines list 12 broad content areas: climate and climate change; hazards; resources; environmental geography and sustainable development; landforms, landscapes and land use; agriculture and food; population; economic geography and globalization; development and inequality; urban geography; tourism; and cultural geography and regional identities.

The required skills are map skills, inquiry and problem solving, and graphicacy. A 2023 content analysis by Artvinli and Dönmez similarly identifies spatial analysis and interpretation, map skills, GIS, data analysis, field observation, critical thinking, cultural and human geography, and environmental sustainability as recurring iGEO skill families: [DOI 10.59409/ojer.1213392](https://doi.org/10.59409/ojer.1213392).

The [iGEO document library](https://geoolympiad.org/document-library/) provides past questions, reports and a 2025 MMT sample. At the time of this research, the library also notes that some MMT files are temporarily unavailable.

The official library currently states that MMT files are temporarily unavailable. Its [2025 MMT sample](https://geoolympiad.org/wp-content/uploads/2026/01/MMT-Sample-Questions.pdf) also says that the included third-party multimedia is for viewing within that assessment and is not intended for redistribution or publication. GeoLens therefore exposes the official-source option and links to the archive, but does not copy protected iGEO multimedia into the local bank. The option can be enabled when iGEO provides reusable assets or explicit permission.

### Analysis of the provided 2013 sample

The supplied `MMT questions.pdf` contains 40 questions plus instructions. Its design strongly favors evidence reading over isolated recall:

- Resource types include photos, cartograms, ocean maps, process diagrams, climate graphs, data tables, animations, population pyramids, contour diagrams, map projections and cartoons.
- Physical geography includes rivers, glaciers, weathering, climate, hazards, landforms, seasons and Earth–Sun relationships.
- Human geography includes development, migration, population, industry, urban regeneration, culture, globalization and sustainability.
- Prompts commonly ask the learner to identify, compare, infer, sequence or apply a concept.
- The sample uses 30–75 second timings, while current official guidance describes 1–2 minutes depending on complexity.

The website reflects those findings by making the resource visually primary, keeping prompts concise, using four choices and showing topic and skill metadata.

## Gapminder and Worldmapper

These are the two core resources requested for this project.

### Gapminder

[Gapminder’s data page](https://www.gapminder.org/data/) exposes hundreds of indicators, bulk GitHub repositories and downloadable CSV/XLSX files. Gapminder says the data may be reused freely with attribution to Gapminder and, where applicable, the original provider. Its [Systema Globalis repository](https://github.com/open-numbers/ddf--gapminder--systema_globalis) is published under CC BY 4.0.

GeoLens uses Gapminder-style development indicator questions to assess:

- fertility–life expectancy relationships
- population encoded by bubble size
- logarithmic income scales
- temporal trajectories
- cluster interpretation

The rendered charts are purpose-built teaching diagrams; the source link remains attached so a production adapter can replace illustrative data with a frozen, cited Gapminder snapshot.

### Worldmapper

[Worldmapper](https://worldmapper.org/) publishes cartograms in which territories are resized according to a mapped total. Its [FAQ](https://worldmapper.org/faq/) explains how cartogram area works, why additive totals are appropriate, how comparisons should be made and why conventional distance/scale interpretation does not apply.

The prototype includes the [Worldmapper CO₂ Emissions per capita 2020 cartogram](https://worldmapper.org/maps/co%E2%82%82-emissions-per-capita-2020/). According to that map’s technical notes, territory area is resized by absolute CO₂ emissions while colour represents per-capita emissions. The image is credited to Worldmapper and used under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Commercial use requires a separate Worldmapper licence.

GeoLens uses the cartogram to assess:

- distinguishing area encoding from colour encoding
- totals versus rates
- safe inferences from territory size
- proportional comparison
- critical reading of cartogram scale and distortion

## Source registry

| Source | Intended question material | Access | Reuse / operational note |
| --- | --- | --- | --- |
| [Gapminder](https://www.gapminder.org/data/) | Development indicators, time series, bubble charts | CSV/XLSX and DDF repositories | Attribute Gapminder and the original source where applicable |
| [Worldmapper](https://worldmapper.org/maps/) | Cartograms on population, resources, hazards and society | Map pages and technical notes | CC BY-NC-SA 4.0 for non-commercial use; preserve attribution and ShareAlike terms |
| [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) | Landforms, settlements, infrastructure and cultural landscapes | [MediaWiki Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo) | Verify the licence of each file; keep creator, source and licence; do not assume one universal licence |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | Satellite imagery, seasonal change, smoke, ice and vegetation | WMTS/WMS and tiled imagery services | Use NASA’s requested GIBS acknowledgement; review [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) |
| [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Base maps, projection and cartographic questions | Public-domain vector and raster datasets | Public domain; “Made with Natural Earth” is optional but useful provenance |
| [World Bank Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation) | Development, population, urbanisation and inequality | REST API without API keys for standard queries | Check the [dataset terms](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets) and original indicator metadata |
| [USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/) | Earthquake magnitude, depth, location and temporal sequences | FDSN Event API | USGS-produced material is generally public domain, but third-party items may differ; credit USGS per its [copyright guidance](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits) |
| [NOAA NCEI Access Data Service](https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation) | Climate records, station comparisons and seasonal graphs | REST API; CSV, JSON, PDF and NetCDF outputs | Preserve dataset/station/unit/period metadata |
| [NOAA Climate Data Online v2](https://www.ncei.noaa.gov/cdo-web/webservices/v2) | Current and historical climate observations | Token-authenticated REST API | Rate-limited; store no API token in client code |
| [GBIF Occurrence API](https://techdocs.gbif.org/en/openapi/v1/occurrence) | Species occurrences, richness, range and sampling bias | REST API | Each dataset uses CC0, CC BY or CC BY-NC; preserve dataset-level citation and licence per [GBIF terms](https://www.gbif.org/terms) |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Street networks, accessibility, urban form and routing | ODbL data extracts and approved tile providers | Credit OpenStreetMap contributors and respect ODbL; the standard tile service has a strict [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and is not a bulk-download API |

## Responsible generation model

A production generator should not send raw API responses directly to learners. The proposed workflow is:

1. **Acquire** — Query only approved provider endpoints with a bounded geographic extent, time range and result count.
2. **Freeze** — Save the exact data/media snapshot, retrieval timestamp and provider metadata used to author an item.
3. **Transform** — Build an accessible chart, map or media derivative without removing necessary attribution.
4. **Generate** — Instantiate a reviewed question pattern with one defensible answer and plausible distractors.
5. **Validate** — Run schema checks, answer-key checks, licence checks and educator review.
6. **Publish** — Serve the frozen resource with source, creator, licence, access date and verification link.
7. **Retire** — Remove or regenerate items when source data, definitions or licences change.

This avoids answer drift, copyright mistakes and unsupported AI-generated explanations.

### Question schema

The canonical `QuestionRecord` lives in `lib/questions/types.ts`. It stores source and licence metadata, question, four options, answer index/value, reasoning, media link and alt text, category, skill, difficulty, editorial status, origin, timestamps and an optional generation-run ID. The website receives a smaller `PracticeQuestion` projection through the repository layer.

## Project structure

```text
app/
  layout.tsx          Site metadata and document shell
  page.tsx            Generator, test runner and review UI
  globals.css         Responsive visual system and resource renderers
data/questions/
  questions.json      Human-readable reviewed question records
  population-pyramid-draft-questions.json
                      Generated PopulationPyramid.net question bank
  igeo-source.json    Official archive availability and reuse status
  question-bank.ts    JSON-to-application adapter
  sources.ts          Provider, licence and media defaults
lib/questions/
  types.ts            Storage and UI types
  repository.ts       Repository contract and local adapter
  supabase-question-repository.ts
                      Supabase read/write adapter
docs/
  question-data-model.md
                      Data flow and future generation design
  v2-auth-and-leaderboard-plan.md
                      V2 accounts, attempt history and leaderboard plan
supabase/migrations/
  20260720000000_create_question_bank.sql
                      Sources, generation runs, questions and RLS
  20260720120000_add_question_source_url.sql
                      Per-question verification links
  20260720130000_grant_question_bank_service_role.sql
                      Administrative import permissions
public/
  population-pyramids/
                      Locally hosted 2026 population-pyramid images
  worldmapper-co2-2020.png
.openai/
  hosting.json        Sites hosting metadata
```

The website no longer contains question content. It imports a UI projection from the question domain. The 40 educator-reviewed records remain in `data/questions/questions.json`; the live generator reads the complete `data/questions/worldmapper-draft-questions.json` bank and retains reviewed-versus-generated workflow metadata in `question-bank.ts`. Practice mode samples 5 or 10 items; mock mode samples up to 40 items with a single exam countdown.

### Generate the full Worldmapper draft bank

Generate one schema-valid draft question for every entry in the downloaded
Worldmapper manifest while preserving the reviewed questions unchanged:

```bash
npm run questions:generate-worldmapper
```

The command writes `data/questions/worldmapper-draft-questions.json`. Generated
items use category- and title-similar distractors, balanced answer positions,
local media paths, and the original Worldmapper URLs. The live generator can
draw from the full bank by category, while generated records remain marked as
drafts in the domain model until an educator verifies the visible evidence,
accessibility, licensing, and answer quality. Check that the generated file is
current and valid with `npm run questions:check-worldmapper`.

### Generate the PopulationPyramid.net dataset and draft bank

The PopulationPyramid pipeline follows the Worldmapper layout: a reproducible
source manifest, canonical images stored under `data/`, public image copies for
the web app, and a generated question bank. Rebuild the manifest and its 200
draft questions with:

```bash
npm run data:generate-population-pyramid-manifest -- --year=2026
npm run questions:generate-population-pyramids
npm run questions:check-population-pyramids
```

The manifest is written to `data/population-pyramids/pyramids.json` and `.csv`.
It includes pyramid shape, World Bank income group, age shares, sex ratios, and
cautious anomaly tags such as working-age male surplus, conflict/fragility
signals, cohort notches, youth bulges, and aging-heavy structures. These tags
are screening heuristics, not proof of a particular historical cause.

## Supabase storage

The production question API reads published records from Supabase and the browser
falls back to the bundled question bank when Supabase is unavailable. The
migrations normalize source attribution, questions and generation-run audit
records. They enforce exactly four unique options, a matching answer,
difficulty/status enums and public read access only for published items. Drafts
remain private under row-level security; administrative writes require a
server-only secret key.

For a complete local database test:

```bash
npm run supabase:start
npm run supabase:seed:local
npm run deploy:check:local
```

This requires Docker. The reset command, `npm run supabase:reset`, rebuilds the
local database from every migration. Full integration notes are in
[`docs/question-data-model.md`](docs/question-data-model.md).

## Local development

Requirements:

- Node.js 22.13 or newer
- npm

Install and run:

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

### Deploy to Netlify

1. Create a Supabase project and copy `.env.example` to `.env.local`. Use the
   project URL plus a publishable and secret API key from Supabase's Connect
   dialog.
2. Link the project, preview the migrations, apply them, and seed the question
   bank:

```bash
npm run supabase:link -- --project-ref YOUR_PROJECT_REF
npm run supabase:push:dry
npm run supabase:push
npm run supabase:seed
npm run deploy:check
```

3. Import the repository in Netlify. Add `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` as Netlify environment variables with both
   **Builds** and **Functions** scope. Do not add `SUPABASE_SECRET_KEY` to
   Netlify unless a future server-only administrative feature needs it.

The repository's `netlify.toml` runs the public database/RLS check before the
native Next.js build. A deployment stops before publishing when variables,
migrations, seeded published records or row-level security are incorrect.
Netlify then uses its automatically managed OpenNext adapter with these settings:

- Build command: `npm run deploy:check && npm run build:netlify`
- Publish directory: `.next`
- Node.js: `22.13.0`

Run the render smoke test:

```bash
npm test
```

## Accessibility and assessment design

- Semantic buttons and links support keyboard navigation.
- Resource visuals include accessible labels or alt text.
- Colour is not the only signal for answer selection.
- Reduced-motion preferences are respected.
- The timer advances when it reaches zero, but untimed study mode is a recommended next feature.
- Every answer review includes a short explanation and a provider verification link.
- Decorative visualisations are labelled as illustrative so they cannot be confused with a frozen empirical dataset.

## Next steps

See [`docs/v2-auth-and-leaderboard-plan.md`](docs/v2-auth-and-leaderboard-plan.md) for the proposed V2 account, saved-attempt and leaderboard release plan.

1. Add a server-only generation endpoint that writes an audit run and draft questions through the repository.
2. Add frozen Gapminder CSV snapshots and generate charts directly from the cited values.
3. Build reviewed server-side adapters for USGS, World Bank, NASA GIBS, NOAA and GBIF.
4. Add an editorial queue with licence, provenance and answer-key checks before publication.
5. Add item analytics (difficulty and discrimination) without collecting unnecessary student data.

## Attribution

- Worldmapper cartogram: “CO₂ Emissions per capita 2020,” Worldmapper, [source page](https://worldmapper.org/maps/co%E2%82%82-emissions-per-capita-2020/), CC BY-NC-SA 4.0.
- Gapminder question concepts: [Gapminder data](https://www.gapminder.org/data/), with attribution to Gapminder and underlying providers as applicable.
- The iGEO format description is based on the [official iGEO guidelines](https://geoolympiad.org/guidelines/), the [document library](https://geoolympiad.org/document-library/), the research article cited above and the user-provided 2013 sample.

Do not remove source or licence information when extending the question bank.
