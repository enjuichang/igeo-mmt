import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  areAdjacentTopics,
  assertDistinctConcepts,
  normalizeOptionText,
  worldmapperOptionCategory,
  worldmapperSemanticDomain,
  worldmapperSemanticFamily,
} from "../scripts/question_option_taxonomy.mjs";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the GeoLens generator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GeoLens/);
  assert.match(html, /Read the world/);
  assert.match(html, /Build your test/);
  assert.match(html, /Worldmapper cartograms/);
  assert.match(html, /Population pyramids/);
  assert.match(html, /Past iGeo Multimedia Tests/);
  assert.match(html, /Select all sources/);
  assert.match(html, /All available sources selected/);
  assert.match(html, /Mock test/);
  assert.match(html, /40 questions/);
  assert.match(html, /Category you’re curious about/);
  assert.match(html, /Surprise me — balanced mix/);
  assert.match(html, /option value="People">People.*568/s);
  assert.match(html, /iGeo year and host location/);
  assert.match(html, /All iGeo editions.*422/s);
  assert.match(html, /2022.*Paris, France.*40/s);
  assert.match(html, /International Geography Olympiad/);
  assert.match(html, /From real-world evidence to a question you can trust/);
  assert.match(html, /HUMAN VERIFIED/);
  assert.match(html, /PopulationPyramid\.net/);
  assert.match(html, /ACTIVE SOURCE/);
  assert.match(html, /COMING SOON/);
  assert.doesNotMatch(html, /LICENSING RULE|SOURCE STANDARD|Read reuse guidance/);
  assert.doesNotMatch(html, /Include real iGEO past questions/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("Population-pyramid bank contains 300 varied, locally hosted questions", async () => {
  const raw = await readFile(new URL("../data/questions/population-pyramid-draft-questions.json", import.meta.url), "utf8");
  const questions = JSON.parse(raw);
  assert.equal(questions.length, 300);
  assert.equal(new Set(questions.map((question) => question["Question ID"])).size, 300);
  assert.equal(new Set(questions.map((question) => question["Source URL"])).size, 200);
  assert.equal(questions.filter((question) => question["Question Type"] === "country-identification").length, 50);
  assert.equal(questions.filter((question) => question["Question Type"] === "scenario-match").length, 50);

  const answerPositions = [0, 0, 0, 0];

  for (const question of questions) {
    assert.equal(question["Image/Media source"].Provider, "PopulationPyramid.net", question["Question ID"]);
    assert.equal(question.Options.length, 4, question["Question ID"]);
    assert.equal(new Set(question.Options).size, 4, question["Question ID"]);
    assert.ok(question.Options.includes(question.Answer), question["Question ID"]);
    assert.ok(Array.isArray(question["Category/Tags"]), question["Question ID"]);
    await access(new URL(`../${question["Image/Media source"]["Local path"]}`, import.meta.url));
    assert.ok(question["Source URL"], question["Question ID"]);
    assert.ok(question.Explanation.length > 80, question["Question ID"]);
    assert.doesNotThrow(() => assertDistinctConcepts(question.Options, question["Question ID"]));
    answerPositions[question.Options.indexOf(question.Answer)] += 1;

    assert.notEqual(question["Question Type"], "shape-classification", question["Question ID"]);
    assert.doesNotMatch(question["Question Name"], /population-pyramid type best describes/i, question["Question ID"]);

    if (question["Question Type"] === "country-identification") {
      assert.equal(question["Hide media identity"], true, question["Question ID"]);
    }
    if (question["Question Type"] === "scenario-match") {
      assert.equal(question["Option media"].length, 4, question["Question ID"]);
      for (const [index, media] of question["Option media"].entries()) {
        assert.equal(media.Country, question.Options[index], question["Question ID"]);
        await access(new URL(`../${media["Local path"]}`, import.meta.url));
      }
    }
  }

  assert.deepEqual(answerPositions, [75, 75, 75, 75]);
});

test("Past iGeo MMT bank exposes 422 playable questions across 12 editions", async () => {
  const raw = await readFile(new URL("../data/questions/igeo-past-questions.json", import.meta.url), "utf8");
  const questions = JSON.parse(raw);
  const multipleChoice = questions.filter((question) => question["Question Type"] === "multiple-choice");
  const openResponse = questions.filter((question) => question["Question Type"] === "open-response");

  assert.equal(questions.length, 450);
  assert.equal(multipleChoice.length, 422);
  assert.equal(openResponse.length, 28);
  assert.equal(new Set(questions.map((question) => question["Question ID"])).size, 450);
  assert.equal(new Set(questions.map((question) => question["iGeo Year"])).size, 12);
  assert.equal(new Set(questions.map((question) => question.Location)).size, 12);

  for (const question of questions) {
    assert.equal(question["Image/Media source"].Provider, "International Geography Olympiad");
    assert.ok(question["iGeo Year"], question["Question ID"]);
    assert.ok(question.Location, question["Question ID"]);
    assert.ok(question["Question Number"], question["Question ID"]);
    assert.ok(question["Category/Tags"].length > 0, question["Question ID"]);
    await access(new URL(`../${question["Image/Media source"]["Local path"]}`, import.meta.url));

    if (question["Question Type"] === "multiple-choice") {
      assert.equal(question.Options.length, 4, question["Question ID"]);
      assert.equal(new Set(question.Options).size, 4, question["Question ID"]);
      assert.equal(question.Answer, question.Options[question["Answer Index"]], question["Question ID"]);
    } else {
      assert.deepEqual(question.Options, [], question["Question ID"]);
      assert.equal(question["Answer Index"], null, question["Question ID"]);
    }
  }

  const sorted = [...questions].sort((left, right) =>
    left["iGeo Year"] - right["iGeo Year"]
      || left["Category/Tags"].join("|").localeCompare(right["Category/Tags"].join("|"))
      || left.Location.localeCompare(right.Location)
      || left["Question Number"] - right["Question Number"],
  );
  assert.deepEqual(
    questions.map((question) => question["Question ID"]),
    sorted.map((question) => question["Question ID"]),
  );
});

test("Worldmapper bank contains all 1,222 valid source-linked questions", async () => {
  const raw = await readFile(new URL("../data/questions/worldmapper-draft-questions.json", import.meta.url), "utf8");
  const questions = JSON.parse(raw);
  const manifest = JSON.parse(await readFile(new URL("../data/worldmapper/maps.json", import.meta.url), "utf8"));
  const distributionFeatures = JSON.parse(
    await readFile(new URL("../data/worldmapper/distribution-features.json", import.meta.url), "utf8"),
  );
  const itemsByName = new Map(manifest.items.map((item) => [normalizeOptionText(item.name), item]));
  const itemsBySourcePath = new Map(
    manifest.items.map((item) => [new URL(item.map_page_url).pathname.replace(/\/+$/, "").toLowerCase(), item]),
  );
  assert.equal(questions.length, 1222);
  assert.equal(new Set(questions.map((question) => question["Question ID"])).size, 1222);
  assert.equal(new Set(questions.map((question) => question["Source URL"])).size, 1222);
  assert.equal(new Set(questions.map((question) => question["Category/Tags"][0])).size, 11);
  assert.equal(distributionFeatures.feature_version, 1);
  assert.equal(distributionFeatures.item_count, manifest.item_count);
  assert.equal(distributionFeatures.dimensions, 30);
  assert.equal(distributionFeatures.items.length, manifest.item_count);
  for (const feature of distributionFeatures.items) {
    assert.equal(feature.vector.length, distributionFeatures.dimensions, `distribution feature ${feature.index}`);
  }

  for (const question of questions) {
    assert.equal(question.Options.length, 4, question["Question ID"]);
    assert.equal(new Set(question.Options).size, 4, question["Question ID"]);
    assert.ok(question.Options.includes(question.Answer), question["Question ID"]);
    assert.ok(Array.isArray(question["Category/Tags"]), question["Question ID"]);
    assert.ok(question["Image/Media source"]["Image URL"], question["Question ID"]);
    await access(new URL(`../${question["Image/Media source"]["Local path"]}`, import.meta.url));
    assert.ok(question["Source URL"], question["Question ID"]);
    assert.ok(question.Explanation.length > 80, question["Question ID"]);
    assert.doesNotThrow(() => assertDistinctConcepts(question.Options, question["Question ID"]));

    const sourceItem = itemsBySourcePath.get(new URL(question["Source URL"]).pathname.replace(/\/+$/, "").toLowerCase());
    assert.ok(sourceItem, question["Question ID"]);
    const optionCategories = question.Options.map((option) => {
      if (option === question.Answer) return worldmapperOptionCategory(sourceItem);
      const distractorItem = itemsByName.get(normalizeOptionText(option));
      assert.ok(distractorItem, `${question["Question ID"]}: ${option}`);
      return worldmapperOptionCategory(distractorItem);
    });
    assert.equal(new Set(optionCategories).size, 4, `${question["Question ID"]}: ${optionCategories.join(", ")}`);
    const optionItems = question.Options.map((option) => {
      if (option === question.Answer) return sourceItem;
      return itemsByName.get(normalizeOptionText(option));
    });
    const optionDomains = optionItems.map(worldmapperSemanticDomain);
    const optionFamilies = optionItems.map(worldmapperSemanticFamily);
    assert.equal(new Set(optionDomains).size, 4, `${question["Question ID"]}: ${optionDomains.join(", ")}`);
    assert.equal(new Set(optionFamilies).size, 4, `${question["Question ID"]}: ${optionFamilies.join(", ")}`);
    for (let left = 0; left < optionItems.length; left += 1) {
      for (let right = left + 1; right < optionItems.length; right += 1) {
        assert.equal(
          areAdjacentTopics(optionItems[left], optionItems[right]),
          false,
          `${question["Question ID"]}: ${question.Options[left]} / ${question.Options[right]}`,
        );
      }
    }
  }
});
