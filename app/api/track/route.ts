import { geolocation, ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { deviceFromWidth, isBot, parseBrowser, parseOs } from "@/lib/ua";
import { computeVisitorId } from "@/lib/visitor-id";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface TrackPayload {
  site: string;
  type: "pageview" | "custom";
  url?: string;
  referrer?: string | null;
  w?: number;
  name?: string;
  props?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  if (isBot(userAgent)) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const ip = ipAddress(request) || "0.0.0.0";
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return new NextResponse(null, { status: 429, headers: CORS_HEADERS });
  }

  let payload: TrackPayload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }

  if (!payload.site || (payload.type !== "pageview" && payload.type !== "custom")) {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }

  const supabase = createSupabaseAdminClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("domain", payload.site)
    .maybeSingle();

  if (!site) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  let visitorId: string;
  try {
    visitorId = await computeVisitorId({ siteId: site.id, ip, userAgent });
  } catch {
    // Misconfigured deployment (e.g. VISITOR_ID_SALT unset) — fail soft rather than 500ing
    // every visitor on every tracked site.
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }
  const referrerDomain = extractDomain(payload.referrer);
  const { country } = geolocation(request);

  await supabase.from("events").insert({
    site_id: site.id,
    type: payload.type,
    visitor_id: visitorId,
    name: payload.type === "custom" ? payload.name : null,
    url: payload.url ?? null,
    referrer_domain: referrerDomain,
    country: country ?? null,
    device: deviceFromWidth(payload.w),
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    props: payload.props ?? null,
  });

  return NextResponse.json(
    { visitorId },
    { status: 200, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}

function extractDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
