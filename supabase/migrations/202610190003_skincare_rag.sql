-- Shared, private-source skincare knowledge corpus for GlowTrack RAG.
-- Source PDFs stay in their existing private Storage bucket. This migration
-- creates only new tables/functions and a nullable conversation grouping key.

create table if not exists public.skincare_documents (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'Skincare-Documents',
  object_path text not null,
  document_name text not null,
  source_sha256 text not null,
  mime_type text not null default 'application/pdf',
  page_count integer,
  ingestion_status text not null default 'pending'
    check (ingestion_status in ('pending', 'processing', 'ready', 'failed')),
  ingestion_error text,
  embedding_model text not null default 'nomic-embed-text',
  ingested_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create table if not exists public.skincare_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.skincare_documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(content) > 0),
  content_sha256 text not null,
  embedding public.vector(768) not null,
  embedding_model text not null default 'nomic-embed-text',
  created_at timestamptz not null default now(),
  unique (document_id, page_number, chunk_index)
);

create index if not exists skincare_document_chunks_document_idx
  on public.skincare_document_chunks (document_id, page_number, chunk_index);
create index if not exists skincare_document_chunks_embedding_hnsw
  on public.skincare_document_chunks using hnsw (embedding public.vector_cosine_ops);

alter table public.skincare_documents enable row level security;
alter table public.skincare_document_chunks enable row level security;

drop policy if exists skincare_documents_authenticated_read on public.skincare_documents;
create policy skincare_documents_authenticated_read
  on public.skincare_documents for select to authenticated using (true);
drop policy if exists skincare_chunks_authenticated_read on public.skincare_document_chunks;
create policy skincare_chunks_authenticated_read
  on public.skincare_document_chunks for select to authenticated using (true);

grant select on public.skincare_documents, public.skincare_document_chunks to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.skincare_documents, public.skincare_document_chunks from anon, authenticated;

-- RPC used only by the ingestion worker. Its single transaction replaces a
-- document's chunks only after extraction and embedding have both succeeded.
create or replace function public.ingest_skincare_document(
  p_bucket_id text,
  p_object_path text,
  p_document_name text,
  p_source_sha256 text,
  p_status text,
  p_error text default null,
  p_page_count integer default null,
  p_chunks jsonb default '[]'::jsonb,
  p_embedding_model text default 'nomic-embed-text'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  document_uuid uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if p_status not in ('processing', 'ready', 'failed') then
    raise exception 'Invalid ingestion status';
  end if;
  if p_status = 'ready' and jsonb_typeof(p_chunks) <> 'array' then
    raise exception 'Chunks must be a JSON array';
  end if;

  insert into public.skincare_documents as current_doc
    (bucket_id, object_path, document_name, source_sha256, mime_type,
     page_count, ingestion_status, ingestion_error, embedding_model,
     ingested_at, updated_at)
  values
    (p_bucket_id, p_object_path, p_document_name, p_source_sha256,
     'application/pdf', p_page_count, p_status, p_error,
     p_embedding_model, case when p_status = 'ready' then now() end, now())
  on conflict (bucket_id, object_path) do update set
    document_name = excluded.document_name,
    source_sha256 = excluded.source_sha256,
    page_count = excluded.page_count,
    ingestion_status = excluded.ingestion_status,
    ingestion_error = excluded.ingestion_error,
    embedding_model = excluded.embedding_model,
    ingested_at = excluded.ingested_at,
    updated_at = now()
  returning id into document_uuid;

  if p_status = 'ready' then
    delete from public.skincare_document_chunks where document_id = document_uuid;
    insert into public.skincare_document_chunks
      (document_id, page_number, chunk_index, content, content_sha256, embedding, embedding_model)
    select document_uuid,
           (item.chunk->>'page_number')::integer,
           (item.chunk->>'chunk_index')::integer,
           item.chunk->>'content',
           item.chunk->>'content_sha256',
           (item.chunk->>'embedding')::public.vector(768),
           p_embedding_model
    from jsonb_array_elements(p_chunks) as item(chunk);
  end if;
  return document_uuid;
end;
$$;

revoke all on function public.ingest_skincare_document(text,text,text,text,text,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.ingest_skincare_document(text,text,text,text,text,text,integer,jsonb,text) to service_role;

create or replace function public.match_skincare_chunks(
  query_embedding public.vector(768),
  match_count integer default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  page_number integer,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id, d.id, d.document_name, c.page_number, c.content,
         1 - (c.embedding <=> query_embedding)
  from public.skincare_document_chunks c
  join public.skincare_documents d on d.id = c.document_id
  where d.ingestion_status = 'ready'
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 8), 20));
$$;
revoke all on function public.match_skincare_chunks(public.vector, integer) from public, anon;
grant execute on function public.match_skincare_chunks(public.vector, integer) to authenticated;

alter table public.chat_messages
  add column if not exists conversation_id uuid;
create index if not exists chat_messages_user_conversation_created_idx
  on public.chat_messages (user_id, conversation_id, created_at);
