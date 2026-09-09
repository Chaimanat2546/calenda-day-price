alter table public.properties
  add column location text,
  add column image_url text check (image_url is null or image_url ~ '^https://');
