alter table public.skills
add column if not exists toon_in_portfolio boolean not null default true;

update public.skills
set toon_in_portfolio = true
where toon_in_portfolio is null;
