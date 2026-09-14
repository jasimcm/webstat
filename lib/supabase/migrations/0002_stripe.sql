-- Stripe revenue attribution: links an anonymous visitor to a Stripe customer

create table if not exists visitor_stripe_links (
  visitor_id text primary key,
  site_id uuid not null references sites(id) on delete cascade,
  stripe_customer_id text unique,
  first_referrer_domain text,
  first_url text,
  created_at timestamptz not null default now()
);

alter table visitor_stripe_links enable row level security;
-- No policies: accessed only via the server-side service-role key.
