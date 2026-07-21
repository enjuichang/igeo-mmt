import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./load_env_file.mjs";

loadEnvFile();

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

const populationPyramidQuestions = readJson(
  "../data/questions/population-pyramid-draft-questions.json",
);
const reviewedQuestions = readJson("../data/questions/questions.json");
const worldmapperQuestions = readJson(
  "../data/questions/worldmapper-draft-questions.json",
);
const publishAll = process.argv.includes("--publish-all");

let url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
let secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.argv.includes("--local")) {
  const cli = fileURLToPath(new URL("../node_modules/.bin/supabase", import.meta.url));
  const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }));
  url = status.API_URL;
  // The local stack still uses its JWT service-role key for PostgREST writes.
  secretKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
}

function fail(message) {
  console.error(`Supabase seed failed: ${message}`);
  process.exit(1);
}

if (!url || !secretKey) {
  fail("set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local before seeding.");
}

if (!secretKey.startsWith("sb_secret_") && !secretKey.startsWith("eyJ")) {
  fail(
    "SUPABASE_SECRET_KEY is not a Supabase secret key. Copy the sb_secret_ key " +
      "from this project's API Keys page (or use its legacy service_role JWT).",
  );
}

try {
  new URL(url);
} catch {
  fail("SUPABASE_URL is not a valid URL.");
}

const adminHeaders = { apikey: secretKey };
if (secretKey.startsWith("eyJ")) {
  adminHeaders.Authorization = `Bearer ${secretKey}`;
}

const reviewedIds = new Set(reviewedQuestions.map((item) => item["Question ID"]));
const existingPublishedIds = new Set();
const pageSize = 1000;
for (let offset = 0; ; offset += pageSize) {
  const response = await fetch(
    `${url}/rest/v1/questions?select=id&status=eq.published&order=id&offset=${offset}&limit=${pageSize}`,
    { headers: adminHeaders },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? body?.error ?? `HTTP ${response.status}`;
    fail(`existing publication status could not be read (${message}).`);
  }

  const page = await response.json();
  for (const row of page) existingPublishedIds.add(row.id);
  if (page.length < pageSize) break;
}

const rawQuestions = [...worldmapperQuestions, ...populationPyramidQuestions];
const rows = rawQuestions.map((item, index) => {
  const answerIndex = item.Options.indexOf(item.Answer);
  if (answerIndex < 0 || answerIndex > 3) {
    fail(`the answer does not match an option for ${item["Question ID"]}.`);
  }

  const editorAuthored = reviewedIds.has(item["Question ID"]);
  const published = publishAll || editorAuthored || existingPublishedIds.has(item["Question ID"]);
  const isPopulationPyramid = item["Image/Media source"].Provider === "PopulationPyramid.net";
  const localMediaPath = item["Image/Media source"]["Local path"];
  const hasAnomalyTag = item["Category/Tags"].some((tag) =>
    [
      "Sex-structure interpretation",
      "Demographic anomaly investigation",
      "Cohort anomaly interpretation",
    ].includes(tag),
  );
  return {
    id: item["Question ID"],
    source_key: isPopulationPyramid ? "pyramid" : "worldmapper",
    source_url: item["Source URL"],
    question: item["Question Name"],
    options: item.Options,
    answer_index: answerIndex,
    answer: item.Answer,
    reasoning: item.Explanation,
    media_link: isPopulationPyramid
      ? localMediaPath.replace(/^data\/population-pyramids\/images\//, "/population-pyramids/")
      : item["Image/Media source"]["Image URL"],
    media_kind: isPopulationPyramid ? "chart" : "cartogram",
    media_alt: isPopulationPyramid
      ? "Population pyramid showing the selected country or area's 2026 population by age group and sex"
      : `Worldmapper cartogram representing ${item.Answer.toLowerCase()}`,
    category: item["Category/Tags"][0] ?? "Uncategorized",
    tags: item["Category/Tags"],
    skill: isPopulationPyramid ? "Population-pyramid interpretation" : "Cartogram interpretation",
    difficulty: isPopulationPyramid && hasAnomalyTag ? "intermediate" : "foundation",
    status: published ? "published" : "draft",
    origin: editorAuthored ? "editor" : "generated",
    visual_variant: index,
    generation_run_id: null,
    metadata: {
      provider: item["Image/Media source"].Provider,
      localPath: localMediaPath,
      optionMedia: item["Option media"]?.map((media) => ({
        label: media.Label,
        mediaLink: media["Local path"].replace(/^data\/population-pyramids\/images\//, "/population-pyramids/"),
        mediaAlt: `${media.Country} population pyramid, 2026`,
        sourceUrl: media["Source URL"],
      })),
      hideMediaIdentity: item["Hide media identity"],
      questionType: item["Question Type"],
      seededBy: "scripts/seed_supabase.mjs",
    },
  };
});

const chunkSize = 100;
for (let offset = 0; offset < rows.length; offset += chunkSize) {
  const chunk = rows.slice(offset, offset + chunkSize);
  const headers = {
    ...adminHeaders,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };

  const response = await fetch(`${url}/rest/v1/questions?on_conflict=id`, {
    method: "POST",
    headers,
    body: JSON.stringify(chunk),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? body?.error ?? `HTTP ${response.status}`;
    fail(`batch ${offset / chunkSize + 1} could not be stored (${message}).`);
  }
}

const publishedCount = rows.filter((row) => row.status === "published").length;
console.log(`Seeded ${rows.length} questions (${publishedCount} published, ${rows.length - publishedCount} drafts).`);
