import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily constructed so importing this module doesn't require STRIPE_SECRET_KEY at build time. */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}
