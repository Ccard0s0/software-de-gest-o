
-- Roles
create type public.app_role as enum ('admin', 'designer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  accent_color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "auth read companies" on public.companies for select to authenticated using (true);
create policy "admin manage companies" on public.companies for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, slug)
);
create index on public.categories(company_id);
grant select on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "auth read categories" on public.categories for select to authenticated using (true);
create policy "admin manage categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Assets
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.assets(category_id);
create index on public.assets(company_id);
grant select on public.assets to authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;
create policy "auth read assets" on public.assets for select to authenticated using (true);
create policy "admin manage assets" on public.assets for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Storage bucket (private)
insert into storage.buckets (id, name, public) values ('brand-assets','brand-assets', false)
on conflict (id) do nothing;

create policy "auth read brand-assets" on storage.objects for select to authenticated using (bucket_id = 'brand-assets');
create policy "admin write brand-assets" on storage.objects for insert to authenticated with check (bucket_id = 'brand-assets' and public.has_role(auth.uid(),'admin'));
create policy "admin update brand-assets" on storage.objects for update to authenticated using (bucket_id = 'brand-assets' and public.has_role(auth.uid(),'admin'));
create policy "admin delete brand-assets" on storage.objects for delete to authenticated using (bucket_id = 'brand-assets' and public.has_role(auth.uid(),'admin'));

-- Seed companies + default categories
insert into public.companies (slug, name, description, accent_color, sort_order) values
  ('nomadengenuity','Nomad Engenuity','Brand assets', 'oklch(0.65 0.18 250)', 1),
  ('communities','Communities','Brand assets','oklch(0.7 0.17 150)', 2),
  ('factor-ia','factor.IA','Brand assets','oklch(0.68 0.2 30)', 3),
  ('sinfon-ia','Sinfon.IA','Brand assets','oklch(0.62 0.2 310)', 4);

insert into public.categories (company_id, slug, name, sort_order)
select c.id, x.slug, x.name, x.sort_order from public.companies c
cross join (values
  ('logos','Logos',1),
  ('colors-typography','Cores & Tipografia',2),
  ('templates','Templates & Mockups',3),
  ('photography','Fotografia & Vídeo',4),
  ('style-guide','Style Guide',5),
  ('design-system','Design System',6)
) as x(slug,name,sort_order);
