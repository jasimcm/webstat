import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, domain, name, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sites: data });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const domain = String(body.domain ?? "").trim().toLowerCase();
  const name = String(body.name ?? domain).trim();

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .insert({ domain, name })
    .select("id, domain, name, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `${domain} is already being tracked.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ site: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("sites").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
