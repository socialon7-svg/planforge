# PlanForge RAG Agent Notes

- Do not expose raw RAG chunks, `source_file`, page ranges, real names, schools, workplaces, original file names, emails, or phone numbers in the UI.
- Treat `data/rag_chunks_redacted.jsonl` as private server-side context for structure and writing patterns only.
- Generated drafts must be newly written for the user's idea and must not copy chunk sentences.
- HWPX generation lives in `src/lib/hwpx.ts`; keep template handling isolated from UI code.
- Supabase pgvector is prepared in `supabase/schema.sql`, but the MVP search path is local JSONL in `src/lib/rag.ts`.
