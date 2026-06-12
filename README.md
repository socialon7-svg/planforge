# PlanForge RAG

PlanForge RAG is a Next.js MVP that generates PSST-style Korean business-plan drafts from a startup idea. It uses the redacted RAG dataset only as private server-side reference material for structure and writing patterns.

Production deployment:

https://planforge-rag.vercel.app

Vercel project:

- Team/project: `socialon7-svgs-projects/planforge-rag`
- GitHub repository: `socialon7-svg/planforge`

## Features

- Landing page with CTA
- Startup idea input form
- Local JSONL RAG loader and search
- OpenAI or Gemini JSON generation API
- 12 editable result sections
- Copy all and copy section
- JSON, Markdown, and HWPX download
- HWPX template status check
- HWPX export that either replaces placeholders or generates a PSST-style HWPX body when placeholders are missing
- Sample input button for quick testing
- Self-diagnosis checklist
- Supabase pgvector schema for future migration

## Privacy Rules

The app must not expose raw RAG chunks, original PDF names, `source_file`, page ranges, real names, schools, workplaces, original file names, phone numbers, emails, or personal data. RAG chunks are not copy sources; they are structure and pattern references only.

## Setup

```bash
cp .env.example .env.local
```

Set:

```bash
AI_PROVIDER=gemini
AI_FALLBACK_PROVIDER=openai
LOCAL_DRAFT_FALLBACK=true
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Or use OpenAI instead
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4.1-mini
```

Production requires the matching provider key in Vercel project environment variables. For Gemini, set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`. If both provider keys are configured, `AI_FALLBACK_PROVIDER=openai` lets the app try OpenAI when Gemini returns quota or temporary capacity errors. `LOCAL_DRAFT_FALLBACK=true` keeps the MVP usable with a PSST template draft when all external AI providers are temporarily unavailable or out of quota.

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

On PowerShell systems where `npm.ps1` is blocked, use:

```bash
npm.cmd run dev
npm.cmd run build
```

## Structure

```text
src/app                 App Router pages and API routes
src/components          Client UI
src/lib/rag.ts          Local JSONL RAG loader and keyword search
src/lib/openai.ts       AI provider calls for OpenAI and Gemini
src/lib/prompt.ts       Prompt builder
src/lib/export.ts       JSON/Markdown/plain-text helpers
src/lib/hwpx.ts         HWPX placeholder replacement
src/types               Shared TypeScript types
data                    Redacted RAG dataset files
templates               official_template.hwpx
supabase/schema.sql     Future pgvector schema
scripts                 Future ingest scripts
```

## HWPX Placeholders

Place these placeholders in `templates/official_template.hwpx` to enable replacement:

```text
{{ITEM_NAME}}
{{ITEM_SUMMARY}}
{{PROBLEM}}
{{SOLUTION}}
{{MARKET}}
{{COMPETITOR}}
{{BUSINESS_MODEL}}
{{SCALE_UP}}
{{BUDGET}}
{{ROADMAP}}
{{TEAM}}
{{PARTNERS}}
```

The currently provided template is available, but it does not contain supported placeholders yet. The app detects this and falls back to generating a PSST-style HWPX body from the draft.

## PDF Template Pattern Source

The user-provided PDF plans are processed locally with anonymized temporary filenames. Raw PDFs, original filenames, names, contact details, school names, workplace names, and raw extracted text are not stored in the repository. Only aggregate writing-pattern metadata is stored in `data/psst_pdf_template_patterns.json`.

## Implemented

- Runnable Next.js MVP
- Local RAG search with keyword overlap, section weight, and tag match
- OpenAI/Gemini generation route
- Strong privacy and anti-copy prompt rules
- Editable result UI
- JSON, Markdown, and HWPX download
- HWPX placeholder detection API: `/api/templates/hwpx/status`
- Placeholder-free generated HWPX export
- Anonymized PDF-derived PSST template pattern metadata
- README, AGENTS, `.env.example`, Supabase schema

## TODO

- Implement Supabase ingest script and embedding search
- Add placeholders to the official HWPX template if not already present
- Add automated quality checks for generated drafts
- Add external market-stat source verification
- Add per-section regeneration
- Add temporary draft persistence
