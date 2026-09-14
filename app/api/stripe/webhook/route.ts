import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Attribution flow: the tracking script exposes a per-tab visitor id, which the owner's
 * site passes as `client_reference_id` on Stripe Checkout. When the webhook fires, we look
 * up that visitor's earliest pageview to learn which site + referrer/page drove the sale,
 * snapshot it into visitor_stripe_links, then record a `revenue` event carrying the same
 * attribution — so dashboard queries never need to join at read time.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const visitorId = session.client_reference_id;
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (visitorId) {
      const attribution = await findAttribution(supabase, visitorId);

      if (attribution) {
        if (customerId) {
          await supabase.from("visitor_stripe_links").upsert({
            visitor_id: visitorId,
            site_id: attribution.siteId,
            stripe_customer_id: customerId,
            first_referrer_domain: attribution.referrerDomain,
            first_url: attribution.url,
          });
        }

        await supabase.from("events").upsert(
          {
            site_id: attribution.siteId,
            type: "revenue",
            visitor_id: visitorId,
            referrer_domain: attribution.referrerDomain,
            url: attribution.url,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
            stripe_customer_id: customerId ?? null,
            stripe_event_id: event.id,
          },
          { onConflict: "stripe_event_id", ignoreDuplicates: true },
        );
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (customerId) {
      const { data: link } = await supabase
        .from("visitor_stripe_links")
        .select("visitor_id, site_id, first_referrer_domain, first_url")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (link) {
        await supabase.from("events").upsert(
          {
            site_id: link.site_id,
            type: "revenue",
            visitor_id: link.visitor_id,
            referrer_domain: link.first_referrer_domain,
            url: link.first_url,
            amount_cents: invoice.amount_paid ?? 0,
            currency: invoice.currency ?? "usd",
            stripe_customer_id: customerId,
            stripe_event_id: event.id,
          },
          { onConflict: "stripe_event_id", ignoreDuplicates: true },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function findAttribution(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  visitorId: string,
) {
  const { data } = await supabase
    .from("events")
    .select("site_id, referrer_domain, url")
    .eq("visitor_id", visitorId)
    .eq("type", "pageview")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { siteId: data.site_id as string, referrerDomain: data.referrer_domain as string | null, url: data.url as string | null };
}
