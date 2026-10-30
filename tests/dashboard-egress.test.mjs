import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

let server, api, helpers;
let orders, queries, rowCap, failAfter;
const mockKey = "__dashboardEgressClient";

before(async () => {
  globalThis[mockKey] = {
    from(table) {
      assert.equal(table, "joborders");
      const request = { filters: [], limit: Infinity };
      queries.push(request);
      const builder = {
        select(value) { request.select = value; return builder; },
        is(column, value) { request.filters.push(row => row[column] === value); return builder; },
        eq(column, value) { request.filters.push(row => row[column] === value); return builder; },
        gt(column, value) { request.filters.push(row => row[column] > value); return builder; },
        order(column, options) { request.order = [column, options]; return builder; },
        limit(value) { request.limit = value; return builder; },
        returns() { return builder; },
        abortSignal() { return builder; },
        then(resolve, reject) {
          const error = queries.length > failAfter ? { message: "Transport failed" } : null;
          const data = orders.filter(row => request.filters.every(filter => filter(row)))
            .sort((a, b) => a.id - b.id).slice(0, Math.min(rowCap, request.limit));
          return Promise.resolve({ data: error ? null : data, error }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  server = await createServer({
    configFile: false, appType: "custom",
    server: { middlewareMode: true, watch: null, hmr: false },
    plugins: [{
      name: "mock-dashboard-transport", enforce: "pre",
      resolveId(id) { if (/(?:^|\/)supabase(?:\.ts)?$/.test(id)) return "\0dashboard-supabase"; },
      load(id) {
        if (id === "\0dashboard-supabase") return `export const supabase = globalThis[${JSON.stringify(mockKey)}];
          export const supabaseUrl = 'https://example.invalid'; export const supabaseKey = 'test-only';`;
      },
    }],
  });
  api = await server.ssrLoadModule("/src/services/apiJobOrders.ts");
  helpers = await server.ssrLoadModule("/src/lib/helpers.ts");
});

after(async () => { await server?.close(); delete globalThis[mockKey]; });
beforeEach(() => { orders = []; queries = []; rowCap = 500; failAfter = Infinity; });

test("dashboard reads beyond server row caps using a stable ID cursor", async () => {
  rowCap = 2;
  orders = [17, 2, 45, 6, 81].map(id => ({ id, deleted_at: null }));
  const result = await api.getJobOrders();
  assert.deepEqual(result.map(row => row.id), [2, 6, 17, 45, 81]);
  assert.equal(queries.length, 4);
  assert.ok(queries.every(query => query.limit === 500));
  assert.ok(queries.every(query => query.order[0] === "id" && query.order[1].ascending));
});

test("dashboard applies branch and deletion filters to every page", async () => {
  rowCap = 1;
  orders = [
    { id: 1, branch_id: 1, deleted_at: null },
    { id: 2, branch_id: 2, deleted_at: null },
    { id: 3, branch_id: 1, deleted_at: "2026-10-01" },
    { id: 4, branch_id: 1, deleted_at: null },
  ];
  assert.deepEqual((await api.getJobOrders(1)).map(row => row.id), [1, 4]);
  assert.equal(queries.length, 3);
});

test("a later page failure rejects the dashboard instead of displaying partial totals", async () => {
  rowCap = 1; failAfter = 1;
  orders = [1, 2].map(id => ({ id, deleted_at: null }));
  await assert.rejects(api.getJobOrders(), /could not be fetched/);
});

test("empty dashboard finishes after one request", async () => {
  assert.deepEqual(await api.getJobOrders(), []);
  assert.equal(queries.length, 1);
});

test("cancelled dashboards do not continue downloading pages", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.getJobOrders(null, controller.signal), { name: "AbortError" });
  assert.equal(queries.length, 0);
});

test("compact dashboard keeps migrated technician display emails", async () => {
  orders = [{ id: 1, deleted_at: null, users: {
    id: "tech", fullname: "Technician", email: "old@example.invalid", migrated_email: "new@example.invalid",
  } }];
  assert.equal((await api.getJobOrders())[0].users.email, "new@example.invalid");
});

test("compact selection preserves financial metrics, charts and status totals", () => {
  const select = api.DASHBOARD_JOB_ORDER_SELECT;
  assert.ok(!select.includes("*"));
  for (const field of ["payment_details", "receipt_url", "technical_report", "labor_description", "problem_statement"]) {
    assert.ok(!select.includes(field), `Dashboard must not download ${field}`);
  }
  const scalarFields = select.split("clients:")[0].split(",").map(value => value.trim()).filter(Boolean);
  const full = ["Completed", "Pull Out", "Pending", "Repairing"].map((status, i) => ({
    id: i + 1, order_no: `01-00${i}`, status, branch_id: i % 2 + 1,
    created_at: "2026-10-02T00:00:00Z", completed_at: "2026-10-20T00:00:00Z",
    machine_type: "printer", rate: 2500, grand_total: 1350, net_sales: 1000,
    downpayment: 2500, adjustedGrandTotal: 3800,
    clients: { id: i % 2, name: "Example", contact_number: "unused" },
    branches: { id: 1, location: "Example", address: "unused" },
    users: { id: "tech", fullname: "Technician", email: "tech@example.invalid" },
    materials: [
      { material_description: "Part", quantity: 2, unit_price: 25, used: true, total_amount: 50 },
      { material_description: "Other", quantity: 1, unit_price: 500, used: false, total_amount: 500 },
    ],
    technical_report: "unused".repeat(100), payment_details: { cash: 1350 },
  }));
  const compact = full.map(order => ({
    ...Object.fromEntries(scalarFields.map(key => [key, order[key]])),
    adjustedGrandTotal: order.adjustedGrandTotal,
    clients: { id: order.clients.id, name: order.clients.name },
    branches: { id: order.branches.id, location: order.branches.location },
    users: order.users,
    materials: order.materials.map(({ material_description, quantity, unit_price, used }) => ({ material_description, quantity, unit_price, used })),
  }));
  const expenses = [{ created_at: "2026-10-02", amount: 300 }];
  const range = { from: new Date("2026-10-01"), to: new Date("2026-10-31") };
  assert.deepEqual(helpers.calculateMetrics(compact, expenses, range), helpers.calculateMetrics(full, expenses, range));
  assert.deepEqual(helpers.countJobOrdersByStatus(compact), helpers.countJobOrdersByStatus(full));
  assert.deepEqual(helpers.aggregateByWeek(compact), helpers.aggregateByWeek(full));
  assert.deepEqual(helpers.aggregateByMonth(compact), helpers.aggregateByMonth(full));
  assert.ok(JSON.stringify(compact).length < JSON.stringify(full).length);
});
