import { expect, it } from "vitest";
import { assumptions } from "../src/config/assumptions";
import { applyAction } from "../src/domain/operations";
import { runScenario } from "../src/domain/scenarios";
import { brands, seedNetwork } from "../src/domain/seed";
const now = new Date("2026-10-18T03:00:00Z");
it("alur lengkap: pesanan → persetujuan → sekali pindai → foto → batch → diterima → selesai", () => {
  let n = seedNetwork(now);
  const act = (a: Parameters<typeof applyAction>[1], time = now) =>
    (n = applyAction(n, a, time));
  act({ type: "demoOrder", id: "b1", initials: "AB" });
  const order = n.orders.at(-1)!;
  act({
    type: "submit",
    orderId: order.id,
    itemId: order.items[0],
    reason: "Ukuran",
  });
  const id = n.returns.at(-1)!.id;
  expect(() =>
    act({
      type: "submit",
      orderId: order.id,
      itemId: order.items[0],
      reason: "Duplikat",
    }),
  ).toThrow("sudah");
  act({ type: "approve", id });
  const r = n.returns.at(-1)!;
  act({ type: "receive", qr: r.qr, itemId: r.item.id });
  expect(() => act({ type: "receive", qr: r.qr, itemId: r.item.id })).toThrow(
    "terpakai",
  );
  act({
    type: "inspect",
    id,
    checklist: {
      label_ada: true,
      bekas_pakai: false,
      noda: false,
      kerusakan: false,
      kelengkapan: true,
      bau: false,
    },
    photos: ["a.jpg", "b.jpg"],
    decision: "layak_jual",
  });
  act({ type: "queue", id });
  act({ type: "plan" });
  const b = n.batches.at(-1)!;
  expect(b.brandId).toBe("b1");
  expect(b.itemIds).toContain(r.item.id);
  act({ type: "ship", id: b.id });
  act({ type: "arrive", id: b.id });
  act({ type: "finish", id }, new Date("2026-10-23T03:00:00Z"));
  expect(n.returns.at(-1)!.status).toBe("selesai");
  expect(n.returns.at(-1)!.settlement!.status).toBe("refund_diproses");
});
it("pengajuan lewat kebijakan hari ditolak", () => {
  let n = seedNetwork(now);
  n = applyAction(
    n,
    { type: "demoOrder", id: "b1", initials: "AA" },
    new Date("2026-09-01T00:00:00Z"),
  );
  const o = n.orders.at(-1)!;
  expect(() =>
    applyAction(
      n,
      { type: "submit", orderId: o.id, itemId: o.items[0], reason: "Ukuran" },
      now,
    ),
  ).toThrow("batas hari");
});
it("parameter negatif dan kapasitas tidak valid ditolak", () =>
  expect(() =>
    applyAction(
      seedNetwork(now),
      { type: "parameters", parameters: { ...assumptions, wagePerMinute: -1 } },
      now,
    ),
  ).toThrow());
it("barang belum diperiksa tidak dapat langsung masuk batch", () =>
  expect(() =>
    applyAction(seedNetwork(now), { type: "queue", id: "RT-0071" }, now),
  ).toThrow());
it("insiden mencatat nilai penuh dan status sengketa", () => {
  const n = seedNetwork(now);
  n.returns[70].status = "dikonsolidasi";
  const updated = applyAction(
    n,
    { type: "incident", id: n.returns[70].id, incident: "hilang" },
    now,
  );
  expect(updated.returns[70].actualLoss).toBe(n.returns[70].item.value);
  expect(updated.returns[70].status).toBe("sengketa");
});
it("S1–S7 tersedia dan memenuhi hasil mekanis", () => {
  const o = { seed: 42, weeks: 4, multiplier: 1, schedules: 2, promo: false };
  const runs = Array.from({ length: 7 }, (_, i) =>
    runScenario(`S${i + 1}`, brands, assumptions, o),
  );
  expect(runs[1].result.costs.perReturn!).toBeGreaterThan(
    runs[0].result.costs.perReturn!,
  );
  expect(runs[2].result.maxQueue).toBeGreaterThan(runs[0].result.maxQueue);
  expect(runs[3].result.records[0].status).toBe("sengketa");
  expect(runs[4].messages.join(" ")).toContain("terpakai");
  expect(runs[5].messages.join(" ")).toContain("qr_kedaluwarsa");
  expect(runs[6].result.costs.byBrand).toHaveLength(4);
});
