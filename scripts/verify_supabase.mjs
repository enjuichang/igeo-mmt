import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

const supabase = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("questions")
  .select("id, source_url, question_sources(key)")
  .eq("status", "published")
  .limit(1);

if (error) {
  fail(`the schema or public read policy is unavailable (${error.message}).`);
}

if (!data?.length) {
  fail("the database contains no publicly readable published questions; run npm run supabase:seed.");
}

const { data: drafts, error: draftError } = await supabase
  .from("questions")
  .select("id")
  .eq("status", "draft")
  .limit(1);

if (draftError) {
  fail(`the draft privacy check could not run (${draftError.message}).`);
}

if (drafts?.length) {
  fail("row-level security is exposing draft questions to the public key.");
}

console.log(`Supabase deployment check passed for ${parsedUrl.host}.`);
