-- Multi-tenant SaaS foundation: organizations, RBAC, RLS, and audit logs.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organizations (slug, name)
values
  ('nestify', 'Nestify'),
  ('compass-demo', 'Compass Demo'),
  ('nj-realty-group', 'NJ Realty Group')
on conflict (slug) do update set name = excluded.name;

alter table public.cities add column if not exists organization_id uuid references public.organizations(id);
alter table public.properties add column if not exists organization_id uuid references public.organizations(id);
alter table public.agents add column if not exists organization_id uuid references public.organizations(id);
alter table public.leads add column if not exists organization_id uuid references public.organizations(id);

update public.cities
set organization_id = (select id from public.organizations where slug = 'nestify')
where organization_id is null;

update public.properties p
set organization_id = c.organization_id
from public.cities c
where p.city_id = c.id and p.organization_id is null;

update public.agents
set organization_id = (select id from public.organizations where slug = 'nestify')
where organization_id is null;

update public.leads l
set organization_id = coalesce(
  (select p.organization_id from public.properties p where p.id = l.property_id),
  (select id from public.organizations where slug = 'nestify')
)
where organization_id is null;

alter table public.cities alter column organization_id set not null;
alter table public.properties alter column organization_id set not null;
alter table public.agents alter column organization_id set not null;
alter table public.leads alter column organization_id set not null;

create index if not exists cities_organization_id_idx on public.cities(organization_id);
create index if not exists properties_organization_id_idx on public.properties(organization_id);
create index if not exists agents_organization_id_idx on public.agents(organization_id);
create index if not exists leads_organization_id_idx on public.leads(organization_id);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'agent', 'analyst', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

insert into public.organization_members (organization_id, user_id, role)
select
  (select id from public.organizations where slug = 'nestify'),
  ar.user_id,
  case when ar.role = 'admin' then 'admin' else 'agent' end
from public.agent_roles ar
on conflict (organization_id, user_id) do update set role = excluded.role;

insert into public.organization_members (organization_id, user_id, role)
select
  (select id from public.organizations where slug = 'nestify'),
  u.id,
  'admin'
from auth.users u
where u.email = 'hadiabdul8128@gmail.com'
on conflict (organization_id, user_id) do update set role = excluded.role;

update public.agents a
set user_id = u.id
from auth.users u
where a.email = u.email and a.user_id is null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  object_type text not null,
  object_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_organization_created_idx
  on public.audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action);

create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where user_id = auth.uid()
      and organization_id = org_id
      and role = any(allowed_roles)
  )
$$;

create or replace function public.can_read_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(org_id, array['admin', 'agent', 'analyst', 'viewer'])
$$;

create or replace function public.can_manage_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(org_id, array['admin'])
$$;

create or replace function public.can_view_analytics(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(org_id, array['admin', 'analyst'])
$$;

drop policy if exists "Public read cities" on public.cities;
drop policy if exists "Public read active properties" on public.properties;
drop policy if exists "Agents read own profile" on public.agents;
drop policy if exists "Admins manage agents" on public.agents;
drop policy if exists "Users read own role" on public.agent_roles;
drop policy if exists "Admins manage roles" on public.agent_roles;
drop policy if exists "Agents read assigned leads" on public.leads;
drop policy if exists "Agents update assigned leads" on public.leads;
drop policy if exists "Admins manage all leads" on public.leads;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_logs enable row level security;

create policy "Members read own organizations"
  on public.organizations for select
  using (id in (select public.current_user_org_ids()));

create policy "Admins update own organizations"
  on public.organizations for update
  using (public.can_manage_org(id))
  with check (public.can_manage_org(id));

create policy "Members read memberships"
  on public.organization_members for select
  using (
    user_id = auth.uid()
    or public.can_manage_org(organization_id)
  );

create policy "Admins manage memberships"
  on public.organization_members for all
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "Members read org cities"
  on public.cities for select
  using (public.can_read_org(organization_id));

create policy "Admins manage org cities"
  on public.cities for all
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "Members read org properties"
  on public.properties for select
  using (status = 'active' and public.can_read_org(organization_id));

create policy "Admins manage org properties"
  on public.properties for all
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "Members read org agents"
  on public.agents for select
  using (public.can_read_org(organization_id));

create policy "Admins manage org agents"
  on public.agents for all
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "Members read org leads"
  on public.leads for select
  using (
    public.can_manage_org(organization_id)
    or public.can_view_analytics(organization_id)
    or assigned_agent_id in (
      select id
      from public.agents
      where user_id = auth.uid()
        and organization_id = leads.organization_id
    )
  );

create policy "Admins and assigned agents update org leads"
  on public.leads for update
  using (
    public.can_manage_org(organization_id)
    or assigned_agent_id in (
      select id
      from public.agents
      where user_id = auth.uid()
        and organization_id = leads.organization_id
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or assigned_agent_id in (
      select id
      from public.agents
      where user_id = auth.uid()
        and organization_id = leads.organization_id
    )
  );

create policy "Admins read legacy roles"
  on public.agent_roles for select
  using (public.has_org_role((select id from public.organizations where slug = 'nestify'), array['admin']));

create policy "Admins manage legacy roles"
  on public.agent_roles for all
  using (public.has_org_role((select id from public.organizations where slug = 'nestify'), array['admin']))
  with check (public.has_org_role((select id from public.organizations where slug = 'nestify'), array['admin']));

create policy "Admins and analysts read audit logs"
  on public.audit_logs for select
  using (public.has_org_role(organization_id, array['admin', 'analyst']));

create or replace function public.match_properties(
  query_embedding vector(1536),
  match_count int default 24,
  filter_city_slug text default null,
  filter_max_price int default null,
  filter_min_price int default null,
  filter_min_beds int default null,
  filter_organization_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
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
    p.organization_id,
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
  join public.cities c on c.id = p.city_id and c.organization_id = p.organization_id
  where p.status = 'active'
    and p.embedding is not null
    and (filter_organization_id is null or p.organization_id = filter_organization_id)
    and (filter_city_slug is null or c.slug = filter_city_slug)
    and (filter_max_price is null or p.price <= filter_max_price)
    and (filter_min_price is null or p.price >= filter_min_price)
    and (filter_min_beds is null or p.beds >= filter_min_beds)
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;
