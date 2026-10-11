import type { LedgerRow, Order, Payment } from "./types";
export const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
export const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value.slice(0, 10) + "T12:00:00Z"))
    : "Not recorded";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
// Each received payment must explicitly identify a period. Never infer arrears
// from absent transactions or silently allocate excess money to another month.
export function buildLedger(
  orders: Order[],
  payments: Payment[],
  asOf: string,
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const order of orders) {
    if (!order.effectiveDate || !order.dueDay || order.amount <= 0) continue;
    const start = new Date(order.effectiveDate.slice(0, 7) + "-01T12:00:00Z");
    const finish = new Date(asOf.slice(0, 7) + "-01T12:00:00Z");
    for (
      let count = 0;
      start <= finish && count < 1200;
      count++, start.setUTCMonth(start.getUTCMonth() + 1)
    ) {
      const period = start.toISOString().slice(0, 7);
      const lastDay = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
      ).getUTCDate();
      const dueDate = `${period}-${String(Math.min(lastDay, order.dueDay)).padStart(2, "0")}`;
      if (
        dueDate < order.effectiveDate ||
        (order.endDate && dueDate > order.endDate)
      )
        continue;
      const received = round(
        payments
          .filter(
            (p) =>
              p.orderId === order.id &&
              p.period === period &&
              p.status === "RECEIVED" &&
              p.paymentDate.slice(0, 10) <= asOf,
          )
          .reduce((sum, p) => sum + Number(p.amount), 0),
      );
      const outstanding = round(Math.max(0, Number(order.amount) - received));
      rows.push({
        orderId: order.id,
        period,
        dueDate,
        expected: Number(order.amount),
        received,
        outstanding,
        credit: round(Math.max(0, received - Number(order.amount))),
        status:
          outstanding === 0
            ? "Paid"
            : dueDate >= asOf
              ? "Upcoming"
              : received > 0
                ? "Partially paid"
                : "Overdue",
      });
    }
  }
  return rows.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}
export function normalizeFinancial(
  value: string,
  frequency: string,
  certainty: string,
) {
  if (certainty === "Unknown") return null;
  if (
    value.trim() === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  )
    throw new Error("Enter a valid non-negative amount, or select Unknown.");
  return frequency === "Annual" ? round(Number(value) / 12) : Number(value);
}
export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
