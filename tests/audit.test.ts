import { describe, expect, it } from "vitest";
import { assumptions as p } from "../src/config/assumptions";
import { planBatches } from "../src/domain/batches";
import {
  compareModes,
  economicAssessment,
  projectedGroups,
  projection,
} from "../src/domain/cost";
import { csv } from "../src/domain/export";
import { applyAction } from "../src/domain/operations";
import { brands, seedNetwork } from "../src/domain/seed";
import { monteCarlo, scheduleWork, simulate } from "../src/domain/simulator";
import { dispute, inspect, receive, transition } from "../src/domain/state";
const at = "2026-10-18T03:00:00.000Z",
  now = new Date(at),
  o = { seed: 42, weeks: 4, multiplier: 1, schedules: 2, promo: false };
const checklist = {
  label_ada: true,
  bekas_pakai: false,
  noda: false,
  kerusakan: false,
  kelengkapan: true,
  bau: false,
};
function queued() {
  let r = seedNetwork(now).returns[70];
  r = receive(r, r.qr, r.item.id, at);
  r = inspect(r, checklist, ["a", "b"], "layak_jual", p, at);
  return transition(r, "menunggu_batch", at);
}
describe("Audit integritas operasi", () => {
  it("barang berbeda tidak lolos dengan tahan lalu inspeksi", () => {
    const r = seedNetwork(now).returns[70],
      held = transition(receive(r, r.qr, "salah", at), "ditahan", at);
    expect(() =>
      inspect(held, checklist, ["a", "b"], "layak_jual", p, at),
    ).toThrow("Barang berbeda");
  });
  it("QR berlaku tujuh hari dari persetujuan terlambat", () => {
    const n = seedNetwork(now);
    const future = new Date("2026-11-10T03:00:00Z");
    const updated = applyAction(
      n,
      { type: "approve", id: n.returns[60].id },
      future,
    );
    const r = updated.returns[60];
    expect(Date.parse(r.qrExpiresAt) - future.getTime()).toBe(7 * 86400000);
    expect(receive(r, r.qr, r.item.id, future.toISOString()).qrUsed).toBe(true);
  });
  it("QR ditolak tepat waktu kedaluwarsa maupun batas serah lebih awal", () => {
    const r = seedNetwork(now).returns[70];
    expect(() => receive(r, r.qr, r.item.id, r.qrExpiresAt)).toThrow(
      "kedaluwarsa",
    );
    r.deadline = at;
    expect(() => receive(r, r.qr, r.item.id, at)).toThrow("kedaluwarsa");
  });
  it("foto kosong dan duplikat spasi tidak dihitung", () => {
    const r = seedNetwork(now).returns[70],
      received = receive(r, r.qr, r.item.id, at);
    expect(() =>
      inspect(received, checklist, ["a", " a ", " "], "layak_jual", p, at),
    ).toThrow("Minimal");
  });
  it("checklist kategori lain tidak mencemari keputusan", () => {
    const r = seedNetwork(now).returns[70];
    expect(
      inspect(
        receive(r, r.qr, r.item.id, at),
        { ...checklist, sol_bersih: false },
        ["a", "b"],
        "layak_jual",
        p,
        at,
      ).inspection!.decision,
    ).toBe("layak_jual");
  });
  it("menolak waktu tidak valid dan riwayat mundur", () => {
    const r = seedNetwork(now).returns[70];
    expect(() => receive(r, r.qr, r.item.id, "bukan tanggal")).toThrow("Waktu");
    expect(() => transition(r, "diserahkan_di_titik", "2000-01-01")).toThrow(
      "mendahului",
    );
  });
  it("gugatan sebelum penerimaan dan bukti kosong ditolak", () => {
    const r = seedNetwork(now).returns[0];
    r.receivedByBrandAt = at;
    expect(() =>
      dispute(r, "alasan", ["a"], p, "2026-10-17T03:00:00Z"),
    ).toThrow("belum menerima");
    expect(() => dispute(r, "alasan", [" "], p, at)).toThrow("foto");
  });
  it("batch terencana diisi ulang tanpa ongkos tetap baru", () => {
    const a = queued(),
      first = planBatches([a], p, at),
      b = structuredClone(a);
    b.id = "RT-lain";
    b.item.id = "barang-lain";
    const second = planBatches([b], p, at, first.batches);
    expect(second.batches).toHaveLength(1);
    expect(second.batches[0].itemIds).toHaveLength(2);
    expect(second.batches[0].freight).toBe(
      p.freightFixed + 2 * a.item.weight * p.freightPerKg,
    );
    expect(first.batches[0].itemIds).toHaveLength(1);
  });
  it("kapasitas dan tarif batch tetap meski asumsi berubah", () => {
    const a = queued(),
      first = planBatches([a], p, at),
      b = structuredClone(a);
    b.id = "RT-lain";
    b.item.id = "barang-lain";
    const second = planBatches(
      [b],
      { ...p, freightFixed: 900000, batchKg: 100 },
      at,
      first.batches,
    );
    expect(second.batches[0].capacityKg).toBe(p.batchKg);
    expect(second.batches[0].freight).toBe(
      p.freightFixed + 2 * a.item.weight * p.freightPerKg,
    );
  });
  it("batch yang telah dikirim tidak diisi ulang", () => {
    const a = queued(),
      first = planBatches([a], p, at);
    first.batches[0].status = "dikirim";
    expect(planBatches([a], p, at, first.batches).batches).toHaveLength(2);
  });
  it("sengketa tidak bisa diselesaikan tanpa keputusan eksplisit", () => {
    const n = seedNetwork(now);
    n.returns[70].status = "sengketa";
    expect(() =>
      applyAction(n, { type: "finish", id: n.returns[70].id }, now),
    ).toThrow("tersendiri");
    const fixed = applyAction(
      n,
      {
        type: "resolve",
        id: n.returns[70].id,
        outcome: "ditolak",
        reason: "Barang salah dikembalikan ke pembeli",
      },
      now,
    );
    expect(fixed.returns[70].settlement?.status).toBe("ditolak");
  });
  it("sengketa insiden yang selesai tidak memblokir batch", () => {
    let n = seedNetwork(now);
    n.returns = [queued()];
    n = applyAction(n, { type: "plan" }, now);
    const id = n.returns[0].id,
      batchId = n.batches[0].id;
    n = applyAction(n, { type: "incident", id, incident: "hilang" }, now);
    n = applyAction(
      n,
      {
        type: "resolve",
        id,
        outcome: "refund_diproses",
        reason: "Ganti rugi disepakati",
      },
      now,
    );
    n = applyAction(n, { type: "ship", id: batchId }, now);
    n = applyAction(n, { type: "arrive", id: batchId }, now);
    expect(n.batches[0].status).toBe("diterima");
    expect(n.returns[0].status).toBe("selesai");
  });
  it("ID unik walau dua aksi pada milidetik yang sama", () => {
    let n = seedNetwork(now);
    n = applyAction(n, { type: "demoOrder", id: "b1", initials: "AA" }, now);
    n = applyAction(n, { type: "demoOrder", id: "b1", initials: "AA" }, now);
    expect(new Set(n.orders.map((o) => o.id)).size).toBe(n.orders.length);
  });
});
describe("Audit akurasi ekonomi", () => {
  it("pekerjaan datang siang tidak selesai seketika", () => {
    const start = Date.parse(at),
      work = scheduleWork(
        [{ at: start + 3 * 3600000, minutes: 30 }],
        120,
        start,
      );
    expect(work[0].finished - work[0].started).toBe(2 * 3600000);
  });
  it("antrean tidak melewati pekerjaan sebelumnya atau mereset kapasitas saat hari berganti", () => {
    const start = Date.parse(at),
      jobs = [
        { at: start, minutes: 120 },
        { at: start, minutes: 120 },
        { at: start + 86400000, minutes: 120 },
      ],
      work = scheduleWork(jobs, 120, start);
    expect(work[2].started).toBe(start + 2 * 86400000);
    expect(work[2].queueDays).toBe(1);
  });
  it("pekerjaan lintas jam tutup melanjutkan esok hari", () => {
    const start = Date.parse(at),
      work = scheduleWork(
        [{ at: start + 7 * 3600000, minutes: 30 }],
        120,
        start,
      );
    expect(work[0].finished).toBe(start + 86400000 + 3600000);
  });
  it("S7 memakai kedatangan dan mutu yang sama untuk merek tersisa", () => {
    const normal = simulate(brands, p, o),
      leave = simulate(brands, p, { ...o, leaveBrand: "b1" });
    for (const r of leave.records) {
      const before = normal.records.find((x) => x.id === r.id)!;
      expect(before.receipt!.receivedAt).toBe(r.receipt!.receivedAt);
      expect(before.inspection!.decision).toBe(r.inspection!.decision);
    }
  });
  it("sengketa dikecualikan dari metrik selesai dan kehilangan dibedakan", () => {
    const s = simulate(
      brands,
      { ...p, lossProbability: 0.5, damageProbability: 0.5 },
      o,
    );
    expect(s.completed).toBe(0);
    expect(s.averageDays).toBeNull();
    expect(s.records.some((r) => r.incident === "hilang")).toBe(true);
    expect(s.records.every((r) => r.status === "sengketa")).toBe(true);
  });
  it("penambahan jadwal tidak menghasilkan utilisasi di atas kapasitas", () => {
    const s = simulate(brands, { ...p, batchKg: 2, batchVolume: 10 }, o);
    expect(s.utilizationKg).toBeLessThanOrEqual(1);
    expect(s.utilizationVolume).toBeLessThanOrEqual(1);
  });
  it("volume pecahan dan jadwal invalid ditolak dengan jelas", () => {
    expect(() => projection(brands, p, 5.5)).toThrow("bilangan bulat");
    expect(() => simulate(brands, p, { ...o, weeks: 1.5 })).toThrow("Opsi");
  });
  it("Monte Carlo tanpa retur tidak melaporkan biaya nol rupiah", () => {
    const mc = monteCarlo(brands, p, { ...o, multiplier: 0 }, 3);
    expect(mc.low).toBeNull();
    expect(mc.empty).toBe(3);
  });
  it("ekor antrean jaringan tidak menambah sewa pembanding toko", () => {
    const g = projectedGroups(brands, 42, 2, p),
      normal = compareModes(g, brands, p, 1, 4, 1),
      tail = compareModes(g, brands, p, 1, 8, 3);
    expect(tail.modes[1].cost).toBe(normal.modes[1].cost);
    expect(tail.modes[2].cost!).toBeGreaterThan(normal.modes[2].cost!);
  });
  it("penilaian impas menggunakan biaya aktual, bukan hanya volume", () => {
    const c = projection(brands, p, 100);
    expect(economicAssessment(c, brands).allViable).toBe(true);
    c.byBrand[0].perReturn = 100000;
    expect(economicAssessment(c, brands).allViable).toBe(false);
  });
  it("CSV menetralkan formula dan mengutip koma maupun baris baru", () => {
    const output = csv([["=SUM(A1)", "a,b", 'x"y', "line\nnext"]]);
    expect(output).toContain("'=SUM(A1)");
    expect(output).toContain('"a,b"');
    expect(output).toContain('"x""y"');
  });
});

it("estimasi operasional memakai tarif batch yang tercatat, bukan tarif angkut baru", async () => {
  const { runningCost } = await import("../src/domain/running-cost");
  let n = seedNetwork(now);
  n.returns = [queued()];
  n = applyAction(n, { type: "plan" }, now);
  const original = runningCost(n, now.getTime());
  n.parameters.freightFixed = 900000;
  n.parameters.freightPerKg = 50000;
  const changed = runningCost(n, now.getTime());
  expect(changed.byBrand[0].parts.freight).toBe(
    original.byBrand[0].parts.freight,
  );
});
