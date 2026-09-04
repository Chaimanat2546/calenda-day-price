create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_price (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  date date not null,
  status_type text not null check (status_type in ('holiday', 'promotion', 'hot_deal', 'holiday_hot_deal')),
  net_price integer not null check (net_price > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, date)
);
