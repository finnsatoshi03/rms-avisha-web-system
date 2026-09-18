import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "vite";

// Load the real TypeScript modules through the app's existing Vite toolchain.
// Only the Supabase transport is replaced; no test contacts a live database.
let server;
let registry;
let helpers;
let aging;
let api;
let agingApi;
let quotationsApi;
let orders = [];
let writes = [];
let queries = [];
const mockKey = "__jobOrderStatusTestClient";

before(async () => {
  globalThis[mockKey] = {
    from(table) {
      const query = { table, filters: [], payload: undefined };
      queries.push(query);
      const builder = {
        select() { return builder; },
        order() { return builder; },
        range() { return builder; },
        not() { return builder; },
        or(expression) {
          query.orExpression = expression;
          return builder;
        },
        in(column, values) {
          query.filters.push([column, values]);
          return builder;
        },
        eq(column, value) {
          query.filters.push([column, [value]]);
          return builder;
        },
        is() { return builder; },
        update(payload) {
          query.payload = payload;
          return builder;
        },
        then(resolve, reject) {
          if (query.payload) writes.push(query);
          const data = table === "joborders"
            ? orders.filter((row) => query.filters.every(
                ([column, values]) => values.includes(row[column]),
              ))
            : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null },
    appType: "custom",
    plugins: [{
      name: "mock-supabase",
      enforce: "pre",
      resolveId(id) {
        if (/(?:^|\/)supabase(?:\.ts)?$/.test(id)) return "\0test-supabase";
      },
      load(id) {
        if (id === "\0test-supabase") {
          return `export const supabase = globalThis[${JSON.stringify(mockKey)}];
            export const supabaseUrl = 'https://example.invalid';
            export const supabaseKey = 'test-only';`;
        }
      },
    }],
  });
  registry = await server.ssrLoadModule("/src/lib/job-order-statuses.ts");
  helpers = await server.ssrLoadModule("/src/lib/helpers.ts");
  aging = await server.ssrLoadModule("/src/components/job-order/aging-config.ts");
  api = await server.ssrLoadModule("/src/services/apiJobOrders.ts");
  agingApi = await server.ssrLoadModule("/src/services/apiJobOrderEvents.ts");
  quotationsApi = await server.ssrLoadModule("/src/services/apiQuotations.ts");
});

after(async () => {
  await server?.close();
  delete globalThis[mockKey];
});

beforeEach(() => {
  orders = [];
  writes = [];
  queries = [];
});

const additions = ["For Quotation", "Quotation in Progress", "For Pullout"];

test("new statuses have the requested groups, shared sorting, and badge styles", async () => {
  const css = await readFile(new URL("../src/styles/index.css", import.meta.url), "utf8");
  const expectedGroups = ["Intake", "In Progress", "Ready & Billing"];
  additions.forEach((label, index) => {
    const group = registry.JOB_ORDER_STATUS_GROUPS.find(
      (item) => item.items.some((status) => status.label === label),
    );
    assert.equal(group?.label, expectedGroups[index]);
    assert.ok(registry.JOB_ORDER_STATUS_PRIORITY[label.toLowerCase()] > 0);
    const className = helpers.getStatusClass(label);
    assert.ok(className);
    assert.ok(css.includes(`.${className} {`));
  });
  const priorities = additions.map((label) => registry.JOB_ORDER_STATUS_PRIORITY[label.toLowerCase()]);
  assert.ok(priorities[0] < priorities[1] && priorities[1] < priorities[2]);
  assert.ok(priorities[2] < registry.JOB_ORDER_STATUS_PRIORITY["pull out"]);
});

test("dashboard totals include new statuses and preserve legacy records", () => {
  const labels = [...additions, "For Pullout", "Quotation", "Pull Out", "Completed", "Ready to Pickup"];
  const counts = helpers.countJobOrdersByStatus(labels.map((status) => ({ status })));
  assert.equal(counts["For Pullout"], 2);
  assert.equal(counts["For Quotation"], 1);
  assert.equal(counts["Quotation in Progress"], 1);
  assert.equal(counts.Quotation, 1);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), labels.length);
  assert.equal(helpers.getStatusClass("Ready to Pickup"), helpers.getStatusClass("Ready for Pickup"));
  assert.equal(helpers.getStatusClass("rented"), "status-rented");
});

test("job-order filters send exact stored labels, including spaces", async () => {
  await api.getJobOrdersFiltered({ statusFilters: additions });
  const query = queries.find((item) => item.table === "joborders");
  assert.equal(query.orExpression,
    "status.eq.For Quotation,status.eq.Quotation in Progress,status.eq.For Pullout");
});

test("quotation search can find linked jobs by their new status", async () => {
  await quotationsApi.getQuotationJobOrders({ searchTerm: "Quotation in Progress" });
  const query = queries.find((item) => item.table === "joborders");
  assert.ok(query.orExpression.includes("status.ilike.%quotation in progress%"));
});

test("aging query includes the three open statuses and excludes closed/legacy quotation", async () => {
  orders = [...additions, "Completed", "Pull Out", "Canceled", "Quotation"].map((status, index) => ({
    id: index + 1, status, created_at: "2026-09-01T00:00:00Z",
  }));
  const rows = await agingApi.getJobOrderAging();
  assert.deepEqual(rows.map((row) => row.status), additions);
  assert.ok(rows.every((row) => row.isEstimate));
  assert.deepEqual(additions.map(aging.thresholdForStatus), [3, 3, 5]);
});

for (const status of additions) {
  test(`bulk transition to ${status} preserves charges and payment details`, async () => {
    orders = [1500, 2000].map((rate, index) => ({
      id: index + 1, status: "Repairing", rate, warranty_months: 3,
      transferred_to_billing: false,
    }));
    await api.updateJobOrderStatus([1, 2], status);
    assert.equal(writes.length, 2);
    for (const write of writes) {
      assert.deepEqual(write.payload, { status, warranty: null });
    }
  });
}

test("actual Pull Out still applies the existing diagnostic charges", async () => {
  orders = [{ id: 1, status: "For Pullout", rate: 1500, warranty_months: 3 }];
  await api.updateJobOrderStatus([1], "Pull Out");
  assert.deepEqual(writes[0].payload, {
    status: "Pull Out", warranty: null, rate: 250, grand_total: 250, net_sales: 250,
  });
});

test("reopening into For Pullout preserves billing-linked payments but resets counter receipts", async () => {
  orders = [false, true].map((transferred_to_billing, index) => ({
    id: index + 1, status: "Completed", rate: 1500, transferred_to_billing,
  }));
  await api.updateJobOrderStatus([1, 2], "For Pullout");
  assert.equal(writes[0].payload.payment_details, null);
  assert.equal(writes[0].payload.receipt_url, null);
  assert.equal(Object.hasOwn(writes[1].payload, "payment_details"), false);
  assert.equal(Object.hasOwn(writes[1].payload, "receipt_url"), false);
});
