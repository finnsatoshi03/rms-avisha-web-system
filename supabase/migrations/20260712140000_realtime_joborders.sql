-- Phase 3.C5: multi-terminal sync (docs/OPTIMIZATION_PLAN.md)
-- Publishes joborders changes over Supabase Realtime; the client
-- (src/hooks/useJobOrdersRealtime.ts) invalidates job order queries on any
-- change so all open counters stay in sync without manual refresh.
-- Applied to production 2026-07-12 via Management API.
-- Note: not idempotent — re-running errors if the table is already in the
-- publication (check pg_publication_tables first).

alter publication supabase_realtime add table public.joborders;
