create extension if not exists vector;

create table if not exists public.business_plan_chunks (
  id bigserial primary key,
  chunk_id text not null unique,
  source_file text,
  page_range text,
  program_type text,
  industry text,
  section text,
  content text not null,
  purpose text,
  tags text[] default '{}',
  reusable_logic text,
  do_not_copy_phrases text[] default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists business_plan_chunks_section_idx
  on public.business_plan_chunks (section);

create index if not exists business_plan_chunks_industry_idx
  on public.business_plan_chunks (industry);

create index if not exists business_plan_chunks_tags_idx
  on public.business_plan_chunks using gin (tags);

create index if not exists business_plan_chunks_embedding_idx
  on public.business_plan_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.business_plan_chunks enable row level security;

drop policy if exists "service role can manage chunks" on public.business_plan_chunks;
create policy "service role can manage chunks"
  on public.business_plan_chunks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace view public.business_plan_chunk_public as
  select
    id,
    chunk_id,
    program_type,
    industry,
    section,
    content,
    purpose,
    tags,
    reusable_logic,
    created_at
  from public.business_plan_chunks;

create or replace function public.match_business_plan_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  section_filter text default null,
  industry_filter text default null
)
returns table (
  id bigint,
  chunk_id text,
  section text,
  industry text,
  content text,
  purpose text,
  tags text[],
  reusable_logic text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.chunk_id,
    c.section,
    c.industry,
    c.content,
    c.purpose,
    c.tags,
    c.reusable_logic,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.business_plan_chunks c
  where c.embedding is not null
    and (section_filter is null or c.section = section_filter)
    and (industry_filter is null or c.industry ilike '%' || industry_filter || '%')
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
