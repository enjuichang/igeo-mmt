import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./load_env_file.mjs";

loadEnvFile();

let url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
let publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (process.argv.includes("--local")) {
  const cli = fileURLToPath(new URL("../node_modules/.bin/supabase", import.meta.url));
  const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }));
  url = status.API_URL;
  publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
}

function fail(message) {
  console.error(`Supabase deployment check failed: ${message}`);
  process.exit(1);
}

if (!url || !publishableKey) {
  fail("set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the deployment environment.");
}

let parsedUrl;
try {
  parsedUrl = new URL(url);
} catch {
  fail("SUPABASE_URL is not a valid URL.");
}

if (!parsedUrl || !["http:", "https:"].includes(parsedUrl.protocol)) {
  fail("SUPABASE_URL must use http or https.");
}

async function publicQuery(query) {
  const response = await fetch(`${url}/rest/v1/questions?${query}`, {
    headers: { apikey: publishableKey },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message ?? body?.error ?? `HTTP ${response.status}`;
    fail(`the schema or public read policy is unavailable (${message}).`);
  }
  return body;
}

const data = await publicQuery(
  "select=id,source_url,question_sources(key)&status=eq.published&limit=1",
);

if (!data?.length) {
  fail("the database contains no publicly readable published questions; run npm run supabase:seed.");
}

const drafts = await publicQuery("select=id&status=eq.draft&limit=1");

if (drafts?.length) {
  fail("row-level security is exposing draft questions to the public key.");
}

const pastIgeo = await publicQuery(
  "select=id,igeo_year,location,question_number&source_key=eq.igeo&status=eq.published&limit=5000",
);

if (pastIgeo?.length !== 422) {
  fail(`expected 422 published iGeo questions, found ${pastIgeo?.length ?? 0}.`);
}

if (pastIgeo.some((question) =>
  !question.igeo_year || !question.location || !question.question_number
)) {
  fail("published iGeo questions are missing edition metadata.");
}

console.log(`Supabase deployment check passed for ${parsedUrl.host}.`);
