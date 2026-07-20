---
name: generate-mmt-questions
description: Create, revise, and review source-verified iGEO-style Multimedia Test (MMT) geography questions and balanced question sets from maps, cartograms, photographs, diagrams, charts, tables, satellite imagery, video, or audio. Use for evidence-led four-option geography assessment items, answer keys, explanations, distractors, test blueprints, or question-bank records that need one defensible answer, media provenance, accessibility, and editorial validation.
---

# Generate MMT Questions

Create concise geography questions in which a learner must read a visual or multimedia resource, not merely recall an isolated fact. Model the supplied 2013 MMT's evidence-first format while applying stronger current standards for validity, accessibility, provenance, and fairness.

## Preserve the MMT signature

Apply these non-negotiable characteristics:

- Attach a meaningful resource to every question: map, cartogram, photograph, diagram, chart, graph, table, satellite image, video, or audio.
- Provide exactly four options with one and only one defensible answer.
- Make the resource necessary or materially useful for answering the question.
- Keep the prompt and options readable within a short timed setting.
- Assess geographic interpretation, comparison, inference, sequencing, or application more often than factual recall.
- Cover both physical and human geography in a multi-question set.
- Treat every generated item as a draft until its answer, source, licence, and accessibility have been reviewed.

For a full test explicitly modeled on the supplied example, use 40 questions and target roughly 30-75 seconds per item according to resource complexity. If the user requests compliance with a different or current competition specification, verify and follow that specification instead.

## Build a set blueprint

Before authoring multiple questions, define:

1. Number of items and intended age or competition level.
2. Allowed content areas, regions, and source providers.
3. Target balance of physical and human geography.
4. Mix of media, cognitive actions, and difficulty.
5. Timing, output format, and whether answers should be hidden from learners.

Use the user's constraints when provided. Otherwise:

- Include maps or cartograms, photographs or satellite imagery, and charts, tables, or diagrams.
- Include motion or audio only when it adds evidence unavailable from a still frame or transcript.
- Avoid letting one media type, region, or topic dominate the set.
- Emphasize intermediate interpretation; include fewer straightforward and multi-step items.
- Cap pure identification or recall at about one quarter of a balanced set.
- Distribute correct options approximately evenly across A-D and avoid detectable sequences.

Draw content from a broad range such as climate, hazards, resources, sustainability, landforms, rivers, agriculture, population, development, economic geography, urban geography, tourism, culture, and regional identity.

## Author each question

### 1. Select and freeze the resource

Start from a real, inspectable resource. Record the exact version, date or period, units, legend, geographic extent, creator or provider, source URL, licence, attribution, and retrieval date when applicable.

- Prefer primary data, official publications, or reputable educational and scientific sources.
- Preserve the exact media or data snapshot used to establish the answer.
- Confirm that labels, legends, units, scale, dates, and symbols remain legible at delivery size.
- Crop only irrelevant material; do not remove context needed to interpret the resource.
- Do not invent a map, statistic, caption, citation, or licence.
- Do not use remote media whose reuse terms or permanence cannot be established.
- If no suitable resource is available, produce a resource specification and question concept instead of claiming the item is ready.

### 2. Choose one primary cognitive action

Use one clear action as the core of the item:

- identify a geographic feature, distribution, process, or representation;
- interpret a pattern, trend, anomaly, scale, legend, or relationship;
- compare locations, time periods, categories, or representations;
- infer the best-supported cause, effect, condition, or location;
- sequence places, stages, graphs, or events;
- apply a geographic concept to a hazard, planning, sustainability, or field situation;
- evaluate which claim is best supported by the resource.

Require two linked reasoning steps only for advanced items. Do not hide several unrelated tasks inside one question.

### 3. Write the prompt

Write a direct, self-contained prompt that identifies what to inspect and what decision to make.

- Keep wording concise and use vocabulary appropriate to the target level.
- Put shared context in the stem rather than repeating it in every option.
- State units, time periods, reference locations, and comparison bases when they are not unmistakable in the resource.
- Ask about evidence visible in the resource or supported by its documented context.
- Avoid trivia that can be answered just as easily without the resource.
- Avoid negative stems. When a negative is essential, capitalize the cue, as in "Which statement is NOT supported...?"
- Avoid absolutes such as "always" or "never" unless they are geographically valid.
- Avoid trick wording, double negatives, and clues created by grammar or option length.
- Do not copy wording or distinctive content from a past paper; reproduce the assessment pattern, not the item.

### 4. Establish the answer before the distractors

Write a short evidence statement proving the intended answer from the resource and its source metadata. Then write the correct option.

Reject the item if the answer depends on:

- an unreadable detail or absent legend;
- disputed or time-sensitive information without a frozen date;
- a subjective judgment not anchored by criteria;
- cultural stereotypes or a person's appearance;
- knowledge substantially beyond the stated target level;
- an inference stronger than the evidence permits.

### 5. Construct three plausible distractors

Create distractors from likely geographic misconceptions or misreadings, not random alternatives.

- Keep all four options in the same semantic category and at similar specificity.
- Use parallel grammar and roughly similar length.
- Make quantitative options use consistent units and non-overlapping ranges.
- Tie distractors to errors such as reversing a trend, confusing total with rate, misreading an axis, overlooking seasonality, mistaking correlation for causation, or applying the wrong process.
- Ensure each distractor is clearly wrong under the exact wording and documented evidence.
- Avoid synonymous, overlapping, or partly correct options.
- Avoid "all of the above" and "none of the above."
- Avoid joke answers and options that reveal the key through technical detail or repetition from the stem.

### 6. Add explanation and metadata

Explain why the correct answer follows from the evidence and, when useful, name the misconception behind the strongest distractor. Do not merely restate the answer.

Record the item in the exact JSON schema under **Format the deliverable**. Keep licence, attribution, retrieval date, answer-verification notes, accessibility review, difficulty, and expected time in the generation or editorial record when they do not fit that schema. Do not add ad hoc keys to the question object.

## Use strong item patterns

Adapt patterns such as:

- Thematic map or cartogram -> determine the mapped variable or distinguish area from colour encoding.
- Climate graph -> match a biome or location using seasonality, temperature, and precipitation.
- Photograph or satellite image -> identify a landform or process from diagnostic evidence.
- Diagram -> apply a process model or determine the direction of change.
- Table plus locator map -> compare places and infer the best-supported outcome.
- Time series or before-and-after images -> identify a trend, stage, or geographic process.
- Population pyramid -> infer demographic structure or match a place at a stated date.
- Hazard image -> select the most appropriate mitigation or response.
- Map projection -> identify which property is preserved or distorted.
- Network map -> infer flows, hierarchy, or globalization from nodes and links.

Vary patterns across a set. Do not generate many near-duplicate "What does this image show?" questions.

## Meet accessibility and fairness requirements

- Do not make colour the only carrier of answer-relevant information; add labels, patterns, or symbols.
- Provide alt text for still media and a transcript, captions, or an equivalent description for audio and video.
- Keep alt text descriptive but do not encode the correct response in it.
- Confirm sufficient contrast and readable type, axes, labels, legends, and option lettering.
- Avoid resources that require culturally specific familiarity unless that knowledge is the stated learning target and context is supplied.
- Do not infer poverty, crime, intelligence, religion, nationality, or other sensitive conditions from appearance alone.
- Use neutral, respectful place descriptions and represent multiple world regions across a set.
- Provide a non-motion alternative when animation is not essential.

## Validate before delivery

Run every item through all gates below. Revise or reject any item that fails.

### Evidence gate

- Confirm the resource is present, legible, relevant, and correctly attributed.
- Recalculate values and independently verify the answer against the frozen source.
- Confirm the explanation cites the decisive visible evidence.

### Single-answer gate

- Test every option as if arguing it is correct.
- Confirm exactly one option survives the wording, scale, date, and evidence.
- Ask whether any reasonable expert interpretation makes a distractor correct; revise if so.

### Assessment gate

- Confirm the item measures the named geographic skill and matches the stated difficulty.
- Confirm it can be completed within the expected time.
- Confirm the resource, not a wording cue or outside trivia, drives the answer.

### Editorial gate

- Check grammar, capitalization, punctuation, units, place names, and option parallelism.
- Check accessibility, cultural fairness, licence terms, and attribution.
- Check that `Answer` exactly matches one and only one string in `Options`.
- Keep the status as `draft` until educator or editorial review approves publication.

### Set-level gate

- Check topic, region, media, difficulty, and cognitive-action balance.
- Check correct-answer position counts and sequences.
- Remove duplicate facts, media, prompts, and distractor sets.
- Sequence items so resource complexity and difficulty vary rather than climb mechanically.

## Format the deliverable

Return every generated question with exactly these keys and nesting unless the user explicitly requests another schema:

```json
{
  "Question Name": "What does this Worldmapper cartogram represent?",
  "Question ID": "worldmapper-crop-0001-sunflower",
  "Image/Media source": {
    "Provider": "Worldmapper",
    "Local path": "data/worldmapper/images/0001-sunflower-production.png",
    "Image URL": "https://worldmapper.org/wp-content/uploads/2026/02/Crops_SunflowerProduction_2016-660x330.png"
  },
  "Source URL": "https://worldmapper.org/maps/sunflower-production-2016/",
  "Category/Tags": [
    "Agriculture and food",
    "Worldmapper",
    "Cartogram",
    "Crop production",
    "Sunflower"
  ],
  "Options": [
    "Sunflower seed production",
    "Pumpkin production",
    "Cotton production",
    "Barley production"
  ],
  "Answer": "Sunflower seed production",
  "Explanation": "This cartogram shows sunflower seed production in 2016. Territory area is resized according to national production; the greatly enlarged parts of eastern Europe and Russia, together with Argentina, match the geography of major sunflower producers."
}
```

Apply these serialization rules:

- Emit valid JSON with double-quoted keys and strings, no comments, and no trailing commas.
- Return one object for one question. Return a JSON array of these objects for multiple questions or when writing `data/questions/questions.json`.
- Use only the eight top-level keys shown above and preserve their spelling, capitalization, spaces, slash, and order.
- Make `Question Name` the complete learner-facing prompt.
- Make `Question ID` stable, unique, lowercase, and hyphen-delimited. Prefer `provider-topic-sequence-slug`, such as `worldmapper-crop-0001-sunflower`.
- Set `Provider` to the media or data publisher's recognizable name.
- Set `Local path` to a repository-relative path. Verify that the file exists before claiming the item is ready; use an empty string only when the user explicitly permits remote-only media.
- Set `Image URL` to the direct media URL and `Source URL` to the supporting source or metadata page. Use plain URL strings, not Markdown links.
- Put concise broad-to-specific labels in `Category/Tags`; include the provider and media type when useful.
- Store exactly four unique strings in `Options`.
- Make `Answer` exactly equal, including capitalization and punctuation, to one and only one entry in `Options`.
- Make `Explanation` identify the resource, state the decisive evidence, and connect that evidence to the answer. Include the data year or observation date when relevant.
- Do not add answer indices, alt text, validation notes, status, difficulty, timing, licence, or attribution keys to this object. Preserve such information in the source registry or editorial workflow when required.

When writing to the GeoLens project, treat this format as the editorial JSON contract in `data/questions/questions.json`; let `data/questions/question-bank.ts` validate and adapt it to `lib/questions/types.ts`. Do not publish or overwrite reviewed records unless the user explicitly requests it.

## Report uncertainty honestly

Separate ready items from concepts needing a resource, fact check, licence check, or educator review. State the specific unresolved issue. Never fill a gap with a plausible-sounding fact or silently weaken the question to make the answer appear unique.
