# WebStat

Self-hosted, privacy-friendly web analytics for your own sites — a cheaper personal
alternative to [datafa.st](https://datafa.st/). Cookieless visitor/pageview tracking,
custom events, multi-site dashboard, and Stripe revenue attribution (which referrer/page
drove a sale). Runs on Supabase (free tier) + Vercel (free tier) — effectively $0/month
for personal traffic levels.

## One-time setup

### 1. Supabase (database + auth)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Project Settings → API → copy the Project URL, `anon` public key, and `service_role`
   secret key into `.env.local` (copy `.env.local.example` to `.env.local` first).
3. Run the migrations against your project: open the Supabase SQL Editor and paste in
   `lib/supabase/migrations/0001_init.sql`, run it, then do the same for `0002_stripe.sql`.
   (Or use the Supabase CLI: `supabase link`, `supabase db push`.)
4. Generate a random salt for `VISITOR_ID_SALT` in `.env.local`: `openssl rand -hex 32`.
5. Create your one admin login (there is no public signup form on purpose):
   ```bash
   npm run create-admin -- you@example.com yourpassword
   ```

### 2. Stripe (optional — only needed for revenue tracking)

1. Get your secret key from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
   → `STRIPE_SECRET_KEY` in `.env.local`.
2. Create a webhook at [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   pointed at `https://<your-deployment>/api/stripe/webhook`, subscribed to
   `checkout.session.completed` and `invoice.paid`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
3. On the site where you sell things, before redirecting to Stripe Checkout, read
   `window.webstat.visitorId` (set by the tracking script after the first pageview) and
   pass it as `client_reference_id` when creating the Checkout Session — that's what lets
   WebStat attribute the sale back to the referrer/page that drove it.

### 3. Deploy

```bash
vercel link
vercel env add   # add every var from .env.local.example
vercel deploy --prod
```

## Adding a site to track

1. Log in, go to **Sites**, add your domain.
2. Copy the generated embed snippet and paste it before `</head>` on your site:
   ```html
   <script defer src="https://<your-deployment>/script.js" data-site="example.com"></script>
   ```
3. Custom events from your site's own JS: `window.webstat('track', 'signup', { plan: 'pro' })`.

## Local development

```bash
npm install
npm run dev          # rebuilds public/script.js, then starts Next.js
```

To test Stripe webhooks locally, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

## Architecture

- `app/api/track/route.ts` — ingestion endpoint. Cookieless: visitor identity is a daily-
  rotating HMAC hash (site + IP + user-agent + UTC date), not a cookie.
- `tracker/src/index.ts` — the ~1KB embed script, built to `public/script.js` via esbuild
  (`scripts/build-tracker.mjs`).
- `app/api/stripe/webhook/route.ts` — records revenue events, attributing each sale back
  to the visitor's first pageview (referrer + landing page).
- `lib/queries/` — read-side aggregation for the dashboard (traffic + revenue).
- `proxy.ts` — gates `/dashboard`, `/sites`, and `/api/sites` behind Supabase Auth.

See `lib/supabase/migrations/` for the schema.
