-- The current application has no authentication or ownership model yet.
-- These policies preserve the existing demo behaviour while ensuring the
-- Data API access and row access are both explicit. Replace them with
-- tenant/owner-scoped policies before production use.
begin;

grant usage on schema public to anon, authenticated;

grant select on table public.properties to anon, authenticated;
grant select, insert, update, delete on table public.daily_price to anon, authenticated;
grant select, insert, update, delete on table public.hot_deals to anon, authenticated;

alter table public.properties enable row level security;
alter table public.daily_price enable row level security;
alter table public.hot_deals enable row level security;

create policy "demo read properties"
on public.properties
for select
to anon, authenticated
using (true);

create policy "demo manage daily prices"
on public.daily_price
for all
to anon, authenticated
using (true)
with check (true);

create policy "demo manage hot deals"
on public.hot_deals
for all
to anon, authenticated
using (true)
with check (true);

commit;
