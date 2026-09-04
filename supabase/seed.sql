insert into public.properties (name, description)
select 'บ้านพักตัวอย่าง', 'บ้านพักสำหรับทดสอบระบบราคา'
where not exists (select 1 from public.properties);
