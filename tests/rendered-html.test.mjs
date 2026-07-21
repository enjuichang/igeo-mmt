import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(html, /Mock test/);
  assert.match(html, /40 questions/);
  assert.match(html, /Category you’re curious about/);
  assert.match(html, /Surprise me — balanced mix/);
  assert.match(html, /option value="People">People.*568/s);
  assert.match(html, /Include real iGEO past questions/);
  assert.match(html, /Real data.*Carefully made questions/s);
  assert.match(html, /verified by a human/i);
  assert.match(html, /PopulationPyramid\.net/);
  assert.match(html, /FEATURED SOURCE/);
  assert.match(html, /COMING SOON/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("Worldmapper bank contains all 1,222 valid source-linked questions", async () => {
  const raw = await readFile(new URL("../data/questions/worldmapper-draft-questions.json", import.meta.url), "utf8");
  const questions = JSON.parse(raw);
  assert.equal(questions.length, 1222);
  assert.equal(new Set(questions.map((question) => question["Question ID"])).size, 1222);
  assert.equal(new Set(questions.map((question) => question["Source URL"])).size, 1222);
  assert.equal(new Set(questions.map((question) => question["Category/Tags"][0])).size, 11);

  for (const question of questions) {
    assert.equal(question.Options.length, 4, question["Question ID"]);
    assert.equal(new Set(question.Options).size, 4, question["Question ID"]);
    assert.ok(question.Options.includes(question.Answer), question["Question ID"]);
    assert.ok(Array.isArray(question["Category/Tags"]), question["Question ID"]);
    assert.ok(question["Image/Media source"]["Image URL"], question["Question ID"]);
    await access(new URL(`../${question["Image/Media source"]["Local path"]}`, import.meta.url));
    assert.ok(question["Source URL"], question["Question ID"]);
    assert.ok(question.Explanation.length > 80, question["Question ID"]);
  }
});
