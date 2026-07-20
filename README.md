# GeoLens — iGEO Multimedia Test practice generator

GeoLens is a research-backed website prototype for generating source-verified, iGEO-style Multimedia Test (MMT) practice. It turns maps, cartograms, charts, satellite imagery and public geographic datasets into short four-option interpretation questions.

The project is independent and educational. It is not affiliated with, endorsed by, or an official product of the International Geography Olympiad.

## What is implemented

- A polished responsive generator and timed test-taking experience
- 10 reviewed Worldmapper crop-cartogram questions stored as JSON
- Closely related distractors within the same agricultural product family
- Configurable 5 or 10-question practice tests
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
supabase/migrations/
  20260720_create_question_bank.sql
                      Sources, generation runs, questions and RLS
public/
  worldmapper-co2-2020.png
.openai/
  hosting.json        Sites hosting metadata
```

The website no longer contains question content. It imports a UI projection from the question domain. The editorial source of truth is `data/questions/questions.json`; `question-bank.ts` validates and adapts it for the website. The downloaded Worldmapper manifest and images remain separate under `data/worldmapper`.

## Supabase-ready storage

The migration normalizes source attribution, questions and generation-run audit records. It enforces exactly four unique options, a matching answer, difficulty/status enums and public read access only for published items. Generated questions are designed to be inserted server-side as drafts and reviewed before publication; no browser insert policy is granted.

Copy `.env.example` when connecting a Supabase project. Keep `SUPABASE_SERVICE_ROLE_KEY` on the server only. Full integration notes and the planned generation flow are in [`docs/question-data-model.md`](docs/question-data-model.md).

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

1. Create a Supabase project, apply the included migration and add `@supabase/supabase-js`.
2. Add a server-only generation endpoint that writes an audit run and draft questions through the repository.
3. Add frozen Gapminder CSV snapshots and generate charts directly from the cited values.
4. Build reviewed server-side adapters for USGS, World Bank, NASA GIBS, NOAA and GBIF.
5. Add an editorial queue with licence, provenance and answer-key checks before publication.
6. Add item analytics (difficulty and discrimination) without collecting unnecessary student data.

## Attribution

- Worldmapper cartogram: “CO₂ Emissions per capita 2020,” Worldmapper, [source page](https://worldmapper.org/maps/co%E2%82%82-emissions-per-capita-2020/), CC BY-NC-SA 4.0.
- Gapminder question concepts: [Gapminder data](https://www.gapminder.org/data/), with attribution to Gapminder and underlying providers as applicable.
- The iGEO format description is based on the [official iGEO guidelines](https://geoolympiad.org/guidelines/), the [document library](https://geoolympiad.org/document-library/), the research article cited above and the user-provided 2013 sample.

Do not remove source or licence information when extending the question bank.
