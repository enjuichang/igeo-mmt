import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  SupabaseQuestionRepository,
  toPracticeQuestion,
  type SupabaseLikeClient,
} from "@/lib/questions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function publicSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return url && key ? { url, key } : null;
}

export async function GET() {
  const config = publicSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const client = createClient(config.url, config.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const repository = new SupabaseQuestionRepository(
      client as unknown as SupabaseLikeClient,
    );
    const records = await repository.list({ status: "published", limit: 5000 });

    return NextResponse.json(
      { questions: records.map(toPracticeQuestion) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    console.error("Supabase question query failed.", error);
    return NextResponse.json(
      { error: "The published question bank is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
