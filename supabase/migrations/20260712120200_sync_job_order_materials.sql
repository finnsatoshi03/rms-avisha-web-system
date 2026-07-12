-- Phase 2.4a: atomic materials sync RPC (docs/OPTIMIZATION_PLAN.md)
-- Replaces the client-side upsertMaterials flow (~3 round trips per material,
-- read-modify-write stock races) with one transactional call.
-- Behavior notes vs. the old client code:
--   * All-or-nothing: a failure (e.g. not enough stock) rolls everything back;
--     the old code could leave earlier stock updates applied.
--   * Existing rows without material_id are preserved untouched (the old code
--     crashed trying to restore stock for them).
-- Applied to production 2026-07-12 via Management API. Idempotent.

create or replace function public.sync_job_order_materials(
  p_job_order_id bigint,
  p_materials jsonb default '[]'::jsonb
)
returns void
language plpgsql
set search_path = public
as $fn$
declare
  rec record;
  itm record;
  v_existing_qty integer;
  v_row_exists boolean;
  v_new_stock integer;
begin
  -- 1) Materials removed from the job order: restore stock, then delete the row.
  for rec in
    select m.material_id, coalesce(m.quantity, 0) as quantity
    from materials m
    where m.job_order_id = p_job_order_id
      and m.material_id is not null
      and not exists (
        select 1 from jsonb_array_elements(p_materials) e
        where (e->>'material_id')::integer = m.material_id
      )
  loop
    update material_stocks
       set stocks = stocks + rec.quantity
     where id = rec.material_id;
    if not found then
      raise exception 'Could not fetch stock for material ID %', rec.material_id;
    end if;

    delete from materials
     where job_order_id = p_job_order_id
       and material_id = rec.material_id;
  end loop;

  -- 2) Incoming materials: adjust stock by the quantity delta, then update/insert.
  for itm in
    select (e->>'material_id')::integer as material_id,
           e->>'material'               as description,
           (e->>'quantity')::integer    as quantity,
           (e->>'unit_price')::real     as unit_price,
           (e->>'used')::boolean        as used
    from jsonb_array_elements(p_materials) e
  loop
    v_existing_qty := null;
    select quantity into v_existing_qty
      from materials
     where job_order_id = p_job_order_id
       and material_id = itm.material_id;
    v_row_exists := found;

    if coalesce(itm.quantity, 0) - coalesce(v_existing_qty, 0) <> 0 then
      if itm.material_id is null then
        raise exception 'Materials with a quantity must be linked to inventory';
      end if;

      update material_stocks
         set stocks = stocks - (coalesce(itm.quantity, 0) - coalesce(v_existing_qty, 0))
       where id = itm.material_id
       returning stocks into v_new_stock;

      if not found then
        raise exception 'Could not fetch stock for material ID %', itm.material_id;
      end if;
      if v_new_stock < 0 then
        raise exception 'Not enough stock for material ID %', itm.material_id;
      end if;
    end if;

    if v_row_exists then
      update materials
         set quantity = itm.quantity,
             total_amount = coalesce(itm.quantity, 0) * coalesce(itm.unit_price, 0),
             used = itm.used,
             material_description = itm.description,
             unit_price = itm.unit_price
       where job_order_id = p_job_order_id
         and material_id = itm.material_id;
    else
      insert into materials
        (job_order_id, material_id, material_description, quantity, unit_price, total_amount, used)
      values
        (p_job_order_id, itm.material_id, itm.description, itm.quantity, itm.unit_price,
         coalesce(itm.quantity, 0) * coalesce(itm.unit_price, 0), itm.used);
    end if;
  end loop;
end;
$fn$;
