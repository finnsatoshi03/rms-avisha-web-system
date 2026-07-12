-- Phase 2.6: indexable job order search (docs/OPTIMIZATION_PLAN.md)
-- Generated column concatenating the 11 searchable fields + trigram GIN index.
-- The client (getJobOrdersFiltered) now issues one `search_text.ilike.%term%`
-- condition instead of 11 un-indexable per-column ilike ORs.
-- Note: pg_trgm is installed in the `public` schema on this project.
-- Applied to production 2026-07-12 via Management API. Idempotent.

alter table public.joborders add column if not exists search_text text
  generated always as (
    lower(
      coalesce(order_no, '') || ' ' ||
      coalesce(brand_model, '') || ' ' ||
      coalesce(serial_number, '') || ' ' ||
      coalesce(machine_type, '') || ' ' ||
      coalesce(problem_statement, '') || ' ' ||
      coalesce(additional_comments, '') || ' ' ||
      coalesce(labor_description, '') || ' ' ||
      coalesce(accessories, '') || ' ' ||
      coalesce(status, '') || ' ' ||
      coalesce(warranty, '') || ' ' ||
      coalesce(technical_report, '')
    )
  ) stored;

create index if not exists idx_joborders_search_trgm
  on public.joborders using gin (search_text gin_trgm_ops);
