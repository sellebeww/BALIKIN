import { DAY } from "./batches";
import { costModel } from "./cost";
import type { Network } from "./types";
/** Operational estimate: recorded batch quotes, current assumptions for other components. */
export function runningCost(n: Network, now: number) {
  const received = n.returns.filter(
    (r) => r.receipt && r.receipt.operator !== "Operator demo",
  );
  const asOf = n.batches.reduce(
    (time, b) => Math.max(time, Date.parse(b.shippedAt ?? b.scheduledAt)),
    now,
  );
  const first = received.reduce(
      (time, r) => Math.min(time, Date.parse(r.receipt!.receivedAt)),
      now,
    ),
    weeks = Math.max(1, Math.ceil((asOf - first) / (7 * DAY)));
  const result = costModel(
    n.brands.map((b) => ({
      brandId: b.id,
      items: received.filter((r) => r.brandId === b.id).map((r) => r.item),
      batches: n.batches.filter((batch) => batch.brandId === b.id).length,
      waitingDays: received
        .filter((r) => r.brandId === b.id)
        .reduce(
          (sum, r) =>
            sum +
            (r.waitingDays ??
              Math.max(
                0,
                ((r.settlement?.completedAt
                  ? Date.parse(r.settlement.completedAt)
                  : now) -
                  Date.parse(r.receipt!.receivedAt)) /
                  DAY,
              )),
          0,
        ),
    })),
    n.parameters,
    weeks,
  );
  for (const g of result.byBrand) {
    const batches = n.batches.filter((b) => b.brandId === g.brandId);
    g.parts.freight = batches.reduce((s, b) => s + b.freight, 0);
    g.parts.packaging =
      g.count * n.parameters.packagingPerItem +
      batches.reduce(
        (s, b) => s + (b.packagingPerBatch ?? n.parameters.packagingPerBatch),
        0,
      );
    g.total = Object.values(g.parts).reduce((a, b) => a + b, 0);
    g.perReturn = g.count ? g.total / g.count : null;
  }
  const total = received.length
    ? result.byBrand.reduce((s, g) => s + g.total, 0)
    : (n.parameters.weeklyRent + n.parameters.weeklyEquipment) * weeks;
  return {
    ...result,
    total,
    perReturn: received.length ? total / received.length : null,
    breakEvenFee: received.length ? total / received.length : null,
    weeks,
    received: received.length,
  };
}
