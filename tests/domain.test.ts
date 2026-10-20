import { describe, expect, it } from "vitest";
import { assumptions as p } from "../src/config/assumptions";
import { nextSchedule } from "../src/domain/batches";
import {
  breakEvenDensity,
  compareModes,
  costModel,
  projectedGroups,
  projection,
} from "../src/domain/cost";
import { brands, seedNetwork } from "../src/domain/seed";
import { monteCarlo, simulate } from "../src/domain/simulator";
import { dispute, inspect, receive, transition } from "../src/domain/state";
const at = "2026-10-18T03:00:00.000Z";
const record = () => seedNetwork(new Date(at)).returns[70];
const options = {
  seed: 42,
  weeks: 4,
  multiplier: 1,
  schedules: 2,
  promo: false,
};
describe("Gerbang aturan operasi", () => {
  it("QR terpakai ditolak", () => {
    const r = record();
    r.qrUsed = true;
    expect(() => receive(r, r.qr, r.item.id, at)).toThrow("terpakai");
  });
  it("QR kedaluwarsa ditolak", () => {
    const r = record();
    expect(() => receive(r, r.qr, r.item.id, "2026-11-01T00:00:00Z")).toThrow(
      "kedaluwarsa",
    );
  });
  it("tanpa otorisasi ditolak", () =>
    expect(() => receive(undefined, "x", "x", at)).toThrow("Tanpa otorisasi"));
  it("transisi ilegal ditolak", () =>
    expect(() => transition(record(), "selesai", at)).toThrow("tidak sah"));
  it("barang berbeda memakai QR sekali dan ditandai", () => {
    const r = record(),
      n = receive(r, r.qr, "SALAH", at);
    expect(n.status).toBe("tidak_sesuai");
    expect(n.qrUsed).toBe(true);
    expect(r.qrUsed).toBe(false);
  });
  it("foto wajib", () => {
    const r = record(),
      n = receive(r, r.qr, r.item.id, at);
    expect(() => inspect(n, {}, ["a"], "layak_jual", p, at)).toThrow("Minimal");
  });
  it("tepat cut-off masuk Selasa, lewat masuk Jumat", () => {
    expect(nextSchedule("2026-10-20T05:00:00Z")).toBe(
      "2026-10-20T09:00:00.000Z",
    );
    expect(nextSchedule("2026-10-20T05:00:01Z")).toBe(
      "2026-10-23T09:00:00.000Z",
    );
  });
  it("gugatan lewat batas ditolak", () => {
    const r = record();
    r.receivedByBrandAt = "2026-10-01T00:00:00Z";
    expect(() => dispute(r, "Rusak", ["foto"], p, at)).toThrow("berakhir");
  });
});
describe("Ekonomi unit dan simulasi", () => {
  it("biaya tetap angkut tidak turun saat batch setengah kosong", () => {
    const g = projectedGroups([brands[0]], 2, 1);
    const full = costModel(g, p);
    g[0].items.pop();
    const half = costModel(g, p);
    expect(full.byBrand[0].parts.freight - half.byBrand[0].parts.freight).toBe(
      brands[0].weight * p.freightPerKg,
    );
    expect(half.perReturn!).toBeGreaterThan(full.perReturn!);
  });
  it("ongkos impas menutup seluruh biaya", () => {
    const c = projection(brands, p, 42);
    expect(c.breakEvenFee! * 42).toBeCloseTo(c.total);
  });
  it("nol retur tetap mengeluarkan sewa dan tidak membagi nol", () => {
    const c = projection(brands, p, 0);
    expect(c.total).toBe(400000);
    expect(c.perReturn).toBeNull();
  });
  it("alokasi volume tepat", () => {
    for (let n = 0; n < 100; n++)
      expect(projection(brands, p, n).count).toBe(n);
  });
  it("titik impas pertama memenuhi SEMUA merek", () => {
    const n = breakEvenDensity(brands, p)!;
    expect(n).toBeGreaterThan(0);
    expect(
      projection(brands, p, n).byBrand.every(
        (x) =>
          x.perReturn! < brands.find((b) => b.id === x.brandId)!.currentCost,
      ),
    ).toBe(true);
    expect(
      projection(brands, p, n - 1).byBrand.every(
        (x) =>
          x.perReturn! < brands.find((b) => b.id === x.brandId)!.currentCost,
      ),
    ).toBe(false);
  });
  it("seed sama menghasilkan simulasi sama", () =>
    expect(simulate(brands, p, options)).toEqual(simulate(brands, p, options)));
  it("perbandingan memakai barang yang sama dan rumus kurir", () => {
    const g = projectedGroups([brands[0]], 10);
    const c = compareModes(g, [brands[0]], p);
    expect(c.modes[0].cost).toBe(22000 + 3000 + 4 * 500 + 125000 * 0.015);
  });
  it("kepadatan rendah lebih mahal", () =>
    expect(
      simulate(brands, p, { ...options, multiplier: 0.15 }).costs.perReturn!,
    ).toBeGreaterThan(simulate(brands, p, options).costs.perReturn!));
  it("promo meningkatkan antrean dan waktu", () => {
    const base = simulate(brands, p, options),
      promo = simulate(brands, p, { ...options, promo: true });
    expect(promo.maxQueue).toBeGreaterThan(base.maxQueue);
    expect(promo.p90Days).toBeGreaterThan(base.p90Days!);
  });
  it("kejadian kerusakan membentuk sengketa dan kerugian", () => {
    const s = simulate(brands, p, { ...options, incident: true });
    expect(s.records[0].status).toBe("sengketa");
    expect(s.actualLoss).toBeGreaterThan(0);
  });
  it("Monte Carlo berulang identik", () =>
    expect(monteCarlo(brands, p, options, 8)).toEqual(
      monteCarlo(brands, p, options, 8),
    ));
});
it("kapasitas batch dihitung per keberangkatan, tidak dirata-rata lintas jadwal", () => {
  const b = { ...brands[0], weight: 1, volume: 1 };
  const groups = projectedGroups([b], 22, 2, {
    ...p,
    batchKg: 10,
    batchVolume: 100,
  });
  expect(groups[0].batches).toBe(4);
});
it("batas pencarian tanpa impas mengembalikan null", () =>
  expect(
    breakEvenDensity(brands, { ...p, weeklyRent: 100000000 }, 100),
  ).toBeNull());
