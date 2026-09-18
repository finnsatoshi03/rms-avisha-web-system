# Job order status workflow

The shared definitions in `src/lib/job-order-statuses.ts` drive status menus,
filters, sorting, dashboard counts, badge styles, and the aging board.

| Group | New status | Meaning | Aging threshold |
| --- | --- | --- | --- |
| Intake | For Quotation | Waiting for quotation preparation | 3 days |
| In Progress | Quotation in Progress | Quotation is being prepared | 3 days |
| Ready & Billing | For Pullout | Awaiting the customer's pullout | 5 days |

Thresholds are defaults and can be tuned in the shared definitions. Existing
statuses retain their thresholds. The new statuses are open work stages: they
do not complete a job, reduce its charges, start its warranty, or recognize
completed-job revenue. `Pull Out` remains the separate closed status and retains
its diagnostic-fee behavior. Reopening a closed job retains the existing payment
and warranty reset rules.

The legacy `Quotation` status remains available in filters, reports, and sorting.
Existing records and quotation creation/duplication behavior are preserved.
The separate quotation document lifecycle (draft, approval, etc.) is unchanged;
selecting a job-order status does not create or send a quotation document.

## Database verification

Inspected the connected Supabase project's live schema on 2026-09-18:

- `public.joborders.status` is text, without a status enum or check constraint.
- `log_joborder_status_change()` records any changed status automatically.
- `stamp_joborder_completed_at()` only stamps Completed/Pull Out; open statuses
  clear the completion timestamp.
- Billing transfer logic distinguishes the existing Completed/Pull Out statuses.
- Job-order row policies do not restrict individual status values.
- Search includes the status text, and CSV exports use the stored status directly.

No database migration or existing-record rewrite is required for these additions.

## Regression checks

Run `npm run test:job-order-statuses` and `npm run build`. Regression tests load
the actual application modules using Vite with a mocked Supabase transport, and
cover groups/styles, reporting totals, aging queries, bulk transitions, pullout
charges, and billing-linked versus counter-payment behavior when reopening jobs.
