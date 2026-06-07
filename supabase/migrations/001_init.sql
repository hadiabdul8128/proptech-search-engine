-- Enable pgvector
create extension if not exists vector;

-- Cities
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  state text not null,
  seo_title text not null,
  seo_description text not null,
  intro_md text not null default '',
  hero_image text,
  created_at timestamptz not null default now()
);

-- Properties
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  address text not null,
  price integer not null,
  beds integer not null,
  baths numeric(3,1) not null,
  sqft integer not null,
  description text not null,
  features jsonb not null default '[]'::jsonb,
  image_url text not null,
  embedding vector(1536),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists properties_city_id_idx on public.properties(city_id);
create index if not exists properties_price_idx on public.properties(price);
create index if not exists properties_embedding_idx
  on public.properties using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Agents
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text unique not null,
  phone text,
  territories text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Agent roles
create table if not exists public.agent_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('agent', 'admin')),
  created_at timestamptz not null default now()
);

-- Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null default '',
  property_id uuid references public.properties(id) on delete set null,
  city_slug text,
  assigned_agent_id uuid references public.agents(id) on delete set null,
  source text not null default 'website',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists leads_assigned_agent_id_idx on public.leads(assigned_agent_id);
create index if not exists leads_status_idx on public.leads(status);

-- Semantic search RPC
create or replace function public.match_properties(
  query_embedding vector(1536),
  match_count int default 24,
  filter_city_slug text default null,
  filter_max_price int default null,
  filter_min_price int default null,
  filter_min_beds int default null
)
returns table (
  id uuid,
  city_id uuid,
  address text,
  price integer,
  beds integer,
  baths numeric,
  sqft integer,
  description text,
  features jsonb,
  image_url text,
  status text,
  similarity float,
  city_slug text,
  city_name text,
  city_state text
)
language plpgsql
as $$
begin
  return query
  select
    p.id,
    p.city_id,
    p.address,
    p.price,
    p.beds,
    p.baths,
    p.sqft,
    p.description,
    p.features,
    p.image_url,
    p.status,
    1 - (p.embedding <=> query_embedding) as similarity,
    c.slug as city_slug,
    c.name as city_name,
    c.state as city_state
  from public.properties p
  join public.cities c on c.id = p.city_id
  where p.status = 'active'
    and p.embedding is not null
    and (filter_city_slug is null or c.slug = filter_city_slug)
    and (filter_max_price is null or p.price <= filter_max_price)
    and (filter_min_price is null or p.price >= filter_min_price)
    and (filter_min_beds is null or p.beds >= filter_min_beds)
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Helper: check admin role
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agent_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_agent_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agent_roles
    where user_id = auth.uid() and role in ('agent', 'admin')
  );
$$;

-- RLS
alter table public.cities enable row level security;
alter table public.properties enable row level security;
alter table public.agents enable row level security;
alter table public.agent_roles enable row level security;
alter table public.leads enable row level security;

create policy "Public read cities"
  on public.cities for select
  using (true);

create policy "Public read active properties"
  on public.properties for select
  using (status = 'active');

create policy "Agents read own profile"
  on public.agents for select
  using (
    public.is_admin()
    or user_id = auth.uid()
  );

create policy "Admins manage agents"
  on public.agents for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users read own role"
  on public.agent_roles for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Admins manage roles"
  on public.agent_roles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Agents read assigned leads"
  on public.leads for select
  using (
    public.is_admin()
    or assigned_agent_id in (
      select id from public.agents where user_id = auth.uid()
    )
  );

create policy "Agents update assigned leads"
  on public.leads for update
  using (
    public.is_admin()
    or assigned_agent_id in (
      select id from public.agents where user_id = auth.uid()
    )
  );

create policy "Admins manage all leads"
  on public.leads for all
  using (public.is_admin())
  with check (public.is_admin());

-- Service role bypasses RLS; public lead insert via API route only.
