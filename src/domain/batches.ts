import { timestamp, transition } from "./state";
import type { Batch, CostParameters, ReturnRecord } from "./types";
export const DAY = 86400000;
/** Waktu jadwal: 16.00 WIB (09.00 UTC). */
export function nextSchedule(
  readyAt: string,
  cutoffHours = 4,
  weekdays = [2, 5],
): string {
  if (
    !weekdays.length ||
    weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    !Number.isFinite(cutoffHours) ||
    cutoffHours < 0 ||
    cutoffHours > 24
  )
    throw Error("Jadwal mingguan tidak valid.");
  const ready = new Date(timestamp(readyAt));
  for (let d = 0; d < 15; d++) {
    const date = new Date(ready);
    date.setUTCDate(date.getUTCDate() + d);
    date.setUTCHours(9, 0, 0, 0);
    if (
      weekdays.includes(date.getUTCDay()) &&
      date.getTime() - cutoffHours * 3600000 >= ready.getTime()
    )
      return date.toISOString();
  }
  throw Error("Jadwal tidak ditemukan.");
}
export function planBatches(
  records: ReturnRecord[],
  p: CostParameters,
  readyAt: string,
  existing: Batch[] = [],
): { batches: Batch[]; records: ReturnRecord[] } {
  const batches = structuredClone(existing),
    updated = structuredClone(records);
  for (let i = 0; i < updated.length; i++) {
    const r = updated[i];
    if (r.status !== "menunggu_batch") continue;
    if (
      r.receipt?.match !== "sesuai_otorisasi" ||
      !r.inspection ||
      r.inspection.decision === "tidak_sesuai"
    )
      throw Error("Barang belum memenuhi syarat untuk konsolidasi.");
    if (r.item.weight > p.batchKg || r.item.volume > p.batchVolume)
      throw Error("Barang melebihi kapasitas satu batch.");
    const ready = new Date(
      Math.max(timestamp(readyAt), timestamp(r.history.at(-1)?.at ?? readyAt)),
    ).toISOString();
    const at = nextSchedule(ready, p.cutoffHours);
    let b = batches.find(
      (b) =>
        b.status === "terencana" &&
        b.brandId === r.brandId &&
        b.scheduledAt === at &&
        timestamp(b.cutoffAt) >= timestamp(ready) &&
        b.weight + r.item.weight <= (b.capacityKg ?? p.batchKg) + 1e-9 &&
        b.volume + r.item.volume <= (b.capacityVolume ?? p.batchVolume) + 1e-9,
    );
    if (!b) {
      b = {
        id: `B-${r.brandId}-${timestamp(ready)}-${batches.length}`,
        brandId: r.brandId,
        scheduledAt: at,
        cutoffAt: new Date(
          timestamp(at) - p.cutoffHours * 3600000,
        ).toISOString(),
        itemIds: [],
        weight: 0,
        volume: 0,
        status: "terencana",
        freight: 0,
        capacityKg: p.batchKg,
        capacityVolume: p.batchVolume,
        freightFixed: p.freightFixed,
        freightPerKg: p.freightPerKg,
        packagingPerBatch: p.packagingPerBatch,
      };
      batches.push(b);
    }
    b.itemIds.push(r.item.id);
    b.weight += r.item.weight;
    b.volume += r.item.volume;
    b.freight =
      (b.freightFixed ?? p.freightFixed) +
      b.weight * (b.freightPerKg ?? p.freightPerKg);
    updated[i] = {
      ...transition(r, "dikonsolidasi", ready),
      batchId: b.id,
      waitingDays: (timestamp(at) - timestamp(r.receipt.receivedAt)) / DAY,
    };
  }
  return { batches, records: updated };
}
