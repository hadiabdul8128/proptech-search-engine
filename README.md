# AI Home Search

AI-powered real estate search platform with semantic property matching, SEO city pages, lead capture, and agent-routing dashboard.

## Stack

- Next.js App Router
- Supabase (Postgres + pgvector + Auth)
- OpenAI embeddings (`text-embedding-3-small`)
- Tailwind CSS

## Features

- Natural-language home search with hybrid semantic + filter ranking
- SEO city landing pages with JSON-LD
- Property detail pages with lead capture
- Automatic lead routing by territory and round-robin fallback
- Agent dashboard for lead inbox and admin agent management

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and enable the `vector` extension in the SQL editor.

3. Copy env vars:

```bash
cp .env.example .env.local
```

4. Run the migration in Supabase SQL editor:

- [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)

5. Seed cities, mock listings, embeddings, and demo agents:

```bash
npm run seed
```

6. Create an agent user:

- Sign up at `/login`
- In Supabase SQL editor, grant access:

```sql
insert into public.agent_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'your-email@example.com'
on conflict (user_id) do update set role = excluded.role;
```

7. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start Next.js locally
- `npm run build` — production build
- `npm run seed` — generate mock listings, embeddings, and demo agents
- `npm run docker:up` — build and run production container
- `npm run docker:dev` — run dev server in Docker with hot reload

## Docker

Run the app anywhere with Docker. Supabase stays hosted — the container only needs your env vars in `.env.local`.

### Production

```bash
cp .env.example .env.local
# fill in Supabase + OpenAI keys

docker compose --env-file .env.local up --build
```

App: [http://localhost:3000](http://localhost:3000)

Seed the remote database from a container (one-time):

```bash
docker compose --env-file .env.local --profile seed run --rm seed
```

Stop:

```bash
docker compose down
```

### Development (hot reload in Docker)

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | baked at build + runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | baked at build + runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only |
| `OPENAI_API_KEY` | yes | search + seed |
| `NEXT_PUBLIC_SITE_URL` | yes | use public URL in production |
| `ADMIN_EMBED_TOKEN` | optional | admin embed route |
| `APP_PORT` | optional | host port (default `3000`) |

For production deploys, set `NEXT_PUBLIC_SITE_URL` to your public domain before `docker compose build`.

## API routes

- `GET /api/search?q=...&city=...&maxPrice=...`
- `POST /api/leads`
- `POST /api/admin/embed` — requires `Authorization: Bearer $ADMIN_EMBED_TOKEN`
- `GET /api/dashboard/leads`
- `PATCH /api/dashboard/leads/:id`
- `GET|POST /api/dashboard/agents` — admin only

## Deploy

### Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add all env vars from `.env.example`.
4. Deploy.

### Supabase

1. Run the migration SQL on production.
2. Run `npm run seed` locally against production env vars, or run it from CI once secrets are configured.

## Project structure

```text
app/                 Public pages, dashboard, API routes
components/          UI, search, lead capture
lib/                 Supabase, search, routing, SEO helpers
supabase/
  migrations/        Database schema + RPC
  seed/              Cities JSON, generated properties JSON, seed script
```

## Notes

- Listings are mock/seed data for demo purposes.
- Re-embed listings after editing copy with `POST /api/admin/embed`.
- Agent routing priority: property city → lead city → round-robin → fallback agent.
