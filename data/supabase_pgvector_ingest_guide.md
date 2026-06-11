# Supabase pgvector 적재 가이드

## Table schema 예시

```sql
create extension if not exists vector;

create table if not exists business_plan_rag_chunks (
  id bigserial primary key,
  chunk_id text unique not null,
  source_file text not null,
  page_range text,
  program_type text,
  industry text,
  section text,
  content text not null,
  purpose text,
  tags text[],
  reusable_logic text,
  do_not_copy_phrases text[],
  privacy_status text,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists business_plan_rag_chunks_embedding_idx
on business_plan_rag_chunks using ivfflat (embedding vector_cosine_ops);

create index if not exists business_plan_rag_chunks_section_idx
on business_plan_rag_chunks(section);

create index if not exists business_plan_rag_chunks_industry_idx
on business_plan_rag_chunks(industry);
```

## 검색 프롬프트 운영 원칙

1. 사용자 아이디어 입력값에서 산업, 고객, 문제, 기술, 산출물을 추출한다.
2. 먼저 section = Problem, Solution, Business Model, Scale-up 순서로 유사 chunk를 검색한다.
3. 검색된 content는 원문 인용이 아니라 논리 구조 참고자료로만 사용한다.
4. 최종 생성 문장에는 `source_file`, `plan_id`, 업로드 파일명, 사람 이름을 노출하지 않는다.
5. 생성 후 평가기준 JSON으로 2차 보완 프롬프트를 실행한다.
```
Need to provide a new business plan using retrieved chunks.
Use the retrieved chunks only as structural reference.
Do not copy source wording, numbers, names, organizations, or identifying details.
Rewrite for the user's new idea and cite only user-provided evidence or public sources when required.
```
