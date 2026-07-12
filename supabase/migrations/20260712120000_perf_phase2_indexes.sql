-- Phase 2.1: missing FK / hot-path indexes (docs/OPTIMIZATION_PLAN.md)
-- Applied to production 2026-07-12 via Management API. Idempotent.

create index if not exists idx_materials_job_order_id on public.materials (job_order_id);
create index if not exists idx_materials_material_id on public.materials (material_id);
create index if not exists idx_joborders_client_id on public.joborders (client_id);
create index if not exists idx_joborders_branch_id on public.joborders (branch_id);
create index if not exists idx_joborders_technician_id on public.joborders (technician_id);
create index if not exists idx_joborders_order_received on public.joborders (order_received);
create index if not exists idx_joborders_status on public.joborders (status);
create index if not exists idx_joborders_deleted_created on public.joborders (deleted_at, created_at desc);
create index if not exists idx_expenses_branch_id on public.expenses (branch_id);
create index if not exists idx_users_branch_id on public.users (branch_id);
create index if not exists idx_material_stocks_branch_id on public.material_stocks (branch_id);

-- Intentionally skipped: FK indexes on tiny/rarely-joined tables flagged by the
-- advisor (rentals, billing_* audit tables, system_settings, etc.) — write
-- overhead without measurable read benefit at current row counts.
