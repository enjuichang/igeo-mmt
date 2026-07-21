import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import rawQuestions from "../data/questions/worldmapper-draft-questions.json" with { type: "json" };
import reviewedQuestions from "../data/questions/questions.json" with { type: "json" };

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

try {
  new URL(url);
} catch {
  fail("SUPABASE_URL is not a valid URL.");
}

const reviewedIds = new Set(reviewedQuestions.map((item) => item["Question ID"]));
const rows = rawQuestions.map((item, index) => {
  const answerIndex = item.Options.indexOf(item.Answer);
  if (answerIndex < 0 || answerIndex > 3) {
    fail(`the answer does not match an option for ${item["Question ID"]}.`);
  }

  const reviewed = reviewedIds.has(item["Question ID"]);
  return {
    id: item["Question ID"],
    source_key: "worldmapper",
    source_url: item["Source URL"],
    question: item["Question Name"],
    options: item.Options,
    answer_index: answerIndex,
    answer: item.Answer,
    reasoning: item.Explanation,
    media_link: item["Image/Media source"]["Image URL"],
    media_kind: "cartogram",
    media_alt: `Worldmapper cartogram representing ${item.Answer.toLowerCase()}`,
    category: item["Category/Tags"][0] ?? "Uncategorized",
    tags: item["Category/Tags"],
    skill: "Cartogram interpretation",
    difficulty: "foundation",
    status: reviewed ? "published" : "draft",
    origin: reviewed ? "editor" : "generated",
    visual_variant: index,
    generation_run_id: null,
    metadata: {
      provider: item["Image/Media source"].Provider,
      localPath: item["Image/Media source"]["Local path"],
      seededBy: "scripts/seed_supabase.mjs",
    },
  };
});

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const chunkSize = 100;
for (let offset = 0; offset < rows.length; offset += chunkSize) {
  const chunk = rows.slice(offset, offset + chunkSize);
  const { error } = await supabase.from("questions").upsert(chunk, { onConflict: "id" });
  if (error) {
    fail(`batch ${offset / chunkSize + 1} could not be stored (${error.message}).`);
  }
}

const publishedCount = rows.filter((row) => row.status === "published").length;
console.log(`Seeded ${rows.length} questions (${publishedCount} published, ${rows.length - publishedCount} drafts).`);
