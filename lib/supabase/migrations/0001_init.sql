-- WebStat core schema: sites + unified event stream (pageviews + custom events)

create extension if not exists pgcrypto;

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  domain text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id bigint generated always as identity primary key,
  site_id uuid not null references sites(id) on delete cascade,
  type text not null check (type in ('pageview', 'custom', 'revenue')),
  visitor_id text not null,
  name text,
  url text,
  referrer_domain text,
  country text,
  device text,
  browser text,
  os text,
  props jsonb,
  amount_cents integer,
  currency text,
  stripe_customer_id text,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists events_site_time_idx on events (site_id, created_at desc);
create index if not exists events_site_type_time_idx on events (site_id, type, created_at desc);
create index if not exists events_site_referrer_idx on events (site_id, referrer_domain);
create index if not exists events_site_url_idx on events (site_id, url);
create index if not exists events_site_country_idx on events (site_id, country);
create index if not exists events_visitor_idx on events (site_id, visitor_id);

alter table sites enable row level security;
alter table events enable row level security;
-- No policies: all access goes through the server-side service-role key (single-tenant, no client-side reads).
