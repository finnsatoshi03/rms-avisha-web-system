import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let helpers;
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  helpers = await server.ssrLoadModule("/src/lib/job-order-payments.ts");
});
after(async () => { await server?.close(); });

test("direct split payments exclude metadata and malformed amounts", () => {
  assert.deepEqual(helpers.directPaymentEntries({
    cash: 100, gcash: "250.50", billing_sync: { total_paid: 999 },
    check: -1, bank_transfer: "invalid", grabpay: 0, metadata: true,
  }), [{ method: "cash", amount: 100 }, { method: "gcash", amount: 250.5 }]);
  for (const value of [null, [], "cash", undefined]) {
    assert.deepEqual(helpers.directPaymentEntries(value), []);
  }
  assert.equal(helpers.paymentMethodLabel("bank_transfer"), "Bank Transfer");
  assert.equal(helpers.paymentMethodLabel("gcash"), "GCash");
});

test("billing shows this order's allocations, excluding reversals and other sources", () => {
  const allocation = (amount, item, status = "active") => ({ amount, status, billing_line_items: item });
  const payments = [{ id: "split-across-orders", amount: 1000, allocations: [
    allocation(100, { source_type: "job_order", source_id: 12 }),
    allocation(50, { job_order_id: 12 }),
    allocation(200, { job_order_id: 13 }),
    allocation(300, { source_type: "rental", source_id: 12 }),
    allocation(350, { job_order_id: 12 }, "reversed"),
  ] }, { id: "reversed", status: "reversed", allocations: [allocation(100, { job_order_id: 12 })] }];
  const result = helpers.jobOrderBillingPayments(payments, 12);
  assert.equal(result.length, 1);
  assert.equal(result[0].allocatedAmount, 150);
  assert.deepEqual(helpers.jobOrderBillingPayments(payments, 99), []);
});
