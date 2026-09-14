import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Defense-in-depth check for Route Handlers: proxy.ts already gates page routes, but per
 * Next.js guidance a matcher change could silently stop covering an API route, so every
 * mutating endpoint verifies the session itself too.
 */
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
