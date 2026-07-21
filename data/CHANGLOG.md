# Question Review Changelog

## 2026-07-20 - Distribution-aware semantic-separation pass

### Problem corrected

- Removed distractor logic that treated neighboring or inverse topics as sufficiently different, including pairs such as water access/no water access and Serbian language/spread of Serbian language.
- Rejected option sets that were technically assigned to different narrow categories but still clustered around one connected theme, such as access, poverty, education, and mortality indicators in the same question.

### Selection method

- Generated a 30-dimension visual-distribution signature for every one of the 1,222 Worldmapper images. The signature measures the relative area of Worldmapper's regional colours plus coarse spatial occupancy.
- Ranked unrelated candidate topics by similarity to the visible regional distribution rather than by title or source-list proximity.
- Added country/demonym affinity for cropped language and gridded-population maps whose local geometry cannot be compared directly with a global cartogram. This favors unrelated phenomena tied to the same predicted high-value country or region.
- Required the answer and three distractors to occupy four different broad categories, four different semantic domains, and four different semantic families.
- Added subject-root rejection that ignores relationship words such as `no`, `spread`, `access`, `production`, `consumption`, `imports`, and `exports`, preventing superficial variants of one subject from appearing together.

### Question-bank changes

- Regenerated all 1,222 Worldmapper questions, including the option sets in all 40 editor-reviewed records, while preserving every correct answer and its A-D position.
- Reviewed 3,666 Worldmapper distractor placements.
- Adjacent-topic pairs remaining: 0.
- Same-family option sets remaining: 0.
- Same-domain option sets remaining: 0.
- Same-category option sets remaining: 0.
- Final answer-position distribution remains A 306, B 306, C 305, D 305.

Examples after the pass:

- `Water Access` is contrasted with religious population, mobile subscriptions, and cement-production emissions—not with another water, sanitation, poverty, education, or mortality indicator.
- `No Water Access` is contrasted with death-penalty sentences, goats, and Muslim population.
- `Serbian Language` is contrasted with migration to Serbia, Serbia/Kosovo/Montenegro gridded population, and chicory production. These topics are semantically independent, while their Balkan emphasis makes them visually plausible alternatives.
- `Sunflower seed production` is contrasted with migration to Cuba, heatwave deaths, and Christian Orthodox population, selected for similar cartogram distributions across unrelated subject families.

### Safeguards added

- Added `scripts/generate_worldmapper_distribution_features.py` and the reproducible feature artifact at `data/worldmapper/distribution-features.json`.
- Updated `scripts/generate_worldmapper_questions.mjs` to combine visual distribution similarity, geographic affinity, subject-root exclusion, and semantic-family separation.
- Updated `scripts/question_option_taxonomy.mjs` with explicit semantic domains, seven broad semantic families, and adjacent-topic detection.
- Updated `skills/generate-mmt-questions/SKILL.md` so future distractors must pass both semantic-distance and geographic-distribution plausibility checks.
- Updated automated tests to reject adjacent topics and repeated categories, domains, or semantic families.

## 2026-07-20 - Cross-category option review

### Scope

Reviewed every question-bearing JSON record under `data/questions/`:

- `questions.json`: 40 editor-reviewed Worldmapper questions.
- `worldmapper-draft-questions.json`: 1,222 Worldmapper questions, including the 40 reviewed records above.
- `population-pyramid-draft-questions.json`: 300 population-pyramid questions.
- Total reviewed: 1,562 stored records representing 1,522 unique questions.

`igeo-source.json` was inspected but contains source metadata rather than questions, so it required no question-option changes.

### Option-design rule applied

- Require all four options to represent different conceptual categories, processes, causal pathways, implications, or evidence patterns.
- Prohibit options that differ only by year range, a small numeric boundary, sex label, trend word, or neighboring subtype.
- Preserve parallel grammar and comparable specificity without making the options minor variants of the same concept.
- Continue requiring exactly four unique options and exactly one answer that matches an option verbatim.

### Worldmapper changes

- Replaced the distractors in all 40 reviewed questions with cross-category alternatives while preserving every correct answer and its A-D position.
- Regenerated all 1,222 Worldmapper records with distractors selected from four distinct conceptual families.
- Added a 16-family option taxonomy covering hazards, health, migration, culture, education, sport, agriculture, energy, environment, population, economy, politics, connectivity, settlement, tourism, and general society.
- Reversed the previous generator behavior that favored closely related titles and categories.
- Reduced year-only or label-only near-duplicate option sets from 92 to 0.
- Verified that every distractor is tied to a real Worldmapper concept rather than an invented label.
- Preserved all question IDs, correct answers, source URLs, media paths, media URLs, explanations, and answer positions.
- Final answer-position distribution: A 306, B 306, C 305, D 305.

Example change:

- Before: one crop-production answer was contrasted with three other crop-production options.
- After: the crop-production answer is contrasted with concepts from three different families, such as health, migration, and cultural geography.

### Population-pyramid changes

- Replaced all 116 shape-only prompts without deleting their records; no question now asks learners merely to name a pyramid shape or type.
- Reframed those questions around what age structure commonly implies for school demand, labour-market entry, workforce replacement, older-age dependency, migration imbalance, cohort history, longevity, or planning.
- Rewrote primary-question distractors so each option represents a distinct demographic evidence pattern, including youthful growth, population aging, working-age migration, cohort disruption, female longevity, working-age concentration, or data coverage.
- Added implication questions for working-age bulges and female longevity patterns instead of falling back to shape labels.
- Kept country-identification and scenario questions only when the four pyramid choices represent four contrasting demographic archetypes.
- Preserved all 300 question IDs, source URLs, media paths, and media URLs.
- Final question-type distribution:
  - 110 demographic-implication questions.
  - 66 cause-interpretation questions.
  - 24 special-structure questions.
  - 50 country-identification questions.
  - 50 scenario-match questions.
- Final answer-position distribution: A 75, B 75, C 75, D 75.

Example change:

- Before: options named high-growth, column, or constrictive pyramid types.
- After: options ask the learner to distinguish implications such as expanding school cohorts, an aging-support burden, working-age migration imbalance, or a historical cohort disruption.

### Generator and guideline safeguards

- Added `scripts/question_option_taxonomy.mjs` to classify Worldmapper concepts and detect options that become duplicates after removing years, sex labels, and trend labels.
- Updated `scripts/generate_worldmapper_questions.mjs` to choose and validate cross-category distractors and to refresh reviewed-question options deterministically.
- Updated `scripts/generate_population_pyramid_questions.mjs` to assign distinct internal categories to each option and reject repeated categories.
- Updated `skills/generate-mmt-questions/SKILL.md` so future questions follow the same cross-category rule and population-pyramid questions assess implications rather than shape names.
- Updated `tests/rendered-html.test.mjs` to reject year-only near duplicates, same-category Worldmapper option sets, and population-pyramid shape-classification prompts.

### Verification

- Worldmapper generator freshness check: passed for all 1,222 questions.
- Population-pyramid generator freshness check: passed for all 300 questions.
- Cross-category audit: 0 Worldmapper category failures.
- Near-duplicate audit after removing years and superficial labels: 0 failures.
- Population-pyramid shape-classification audit: 0 remaining questions.
- ESLint on changed generators, taxonomy, and tests: passed.
- Production build: passed.
- Automated tests: 3 passed, 0 failed.
