import { describe, expect, it } from "vitest";
import { buildLedger, normalizeFinancial } from "../src/lib/ledger";
import { demoWorkspace } from "../src/lib/demo";
import type { Order, Payment } from "../src/lib/types";
const order: Order = {
  id: 1,
  proceedingId: 1,
  amount: 10000,
  effectiveDate: "2026-01-01",
  dueDay: 31,
};
const payment: Payment = {
  id: 1,
  orderId: 1,
  amount: 6000,
  paymentDate: "2026-02-02",
  period: "2026-01",
  status: "RECEIVED",
};
describe("maintenance reconciliation", () => {
  it("reconciles the demonstration ledger to 20,000 overdue", () => {
    const d = demoWorkspace();
    expect(
      buildLedger(d.orders, d.payments, "2026-10-09").reduce(
        (s, r) => s + r.outstanding,
        0,
      ),
    ).toBe(20000);
  });
  it("clamps a due day to February and keeps a future obligation upcoming", () => {
    const r = buildLedger([order], [], "2026-02-20");
    expect(r[0]).toMatchObject({ dueDate: "2026-02-28", status: "Upcoming" });
  });
  it("uses explicit payment periods and sums partial receipts", () => {
    const r = buildLedger(
      [order],
      [payment, { ...payment, id: 2, amount: 2000 }],
      "2026-02-20",
    );
    expect(r.find((x) => x.period === "2026-01")).toMatchObject({
      received: 8000,
      outstanding: 2000,
      status: "Partially paid",
    });
  });
  it("does not count failed, pending, future or unallocated receipts", () => {
    const ps: Payment[] = [
      { ...payment, status: "FAILED" },
      { ...payment, status: "PENDING" },
      { ...payment, paymentDate: "2027-01-01" },
      { ...payment, period: undefined },
    ];
    expect(
      buildLedger([order], ps, "2026-02-20").every((r) => r.received === 0),
    ).toBe(true);
  });
  it("does not infer missing schedules from live orders", () => {
    expect(
      buildLedger([{ ...order, effectiveDate: undefined }], [], "2026-10-09"),
    ).toEqual([]);
  });
  it("does not charge periods before effectiveness or after order end", () => {
    const r = buildLedger(
      [
        {
          ...order,
          effectiveDate: "2026-01-20",
          dueDay: 5,
          endDate: "2026-02-10",
        },
      ],
      [],
      "2026-03-30",
    );
    expect(r.map((x) => x.period)).toEqual(["2026-02"]);
  });
  it("keeps overpayments as credits without double-allocating them", () => {
    const r = buildLedger(
      [order],
      [{ ...payment, amount: 15000 }],
      "2026-02-20",
    );
    expect(r.find((x) => x.period === "2026-01")).toMatchObject({
      outstanding: 0,
      credit: 5000,
      status: "Paid",
    });
    expect(r[0].received).toBe(0);
  });
  it("does not label a payment overdue on the due date", () => {
    expect(buildLedger([order], [], "2026-01-31")[0].status).toBe("Upcoming");
  });
});
describe("financial normalization", () => {
  it("keeps unknown distinct from zero", () => {
    expect(normalizeFinancial("", "Monthly", "Unknown")).toBeNull();
    expect(normalizeFinancial("0", "Monthly", "Known")).toBe(0);
  });
  it("normalizes annual recurring income without converting one-time amounts", () => {
    expect(normalizeFinancial("120000", "Annual", "Known")).toBe(10000);
    expect(normalizeFinancial("120000", "One-time", "Known")).toBe(120000);
  });
  it("rejects missing and invalid known values", () => {
    for (const v of ["", "-2", "invalid"])
      expect(() => normalizeFinancial(v, "Monthly", "Known")).toThrow();
  });
});
