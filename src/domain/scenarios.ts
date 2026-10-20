import { seedNetwork } from "./seed";
import { simulate, type SimOptions } from "./simulator";
import { receive, transition } from "./state";
import type { Brand, CostParameters } from "./types";
export const scenarios = [
  {
    id: "S1",
    name: "Minggu normal",
    description:
      "Ukur biaya dan isian batch pada rerata merek aktif; jangan menganggap batch penuh.",
  },
  {
    id: "S2",
    name: "Kepadatan rendah",
    description: "15% volume normal. Biaya tetap tersebar pada sedikit retur.",
  },
  {
    id: "S3",
    name: "Lonjakan promo",
    description: "Volume 6× pada minggu kedua, kapasitas operator tetap.",
  },
  {
    id: "S4",
    name: "Insiden konsolidasi",
    description:
      "Satu insiden paksa membuka sengketa dan mencatat nilai kerugian.",
  },
  {
    id: "S5",
    name: "Barang tidak sesuai",
    description:
      "Uji barang berbeda, tanpa otorisasi, dan QR yang dipakai ulang.",
  },
  {
    id: "S6",
    name: "QR hangus",
    description: "Pembeli tidak datang hingga batas waktu; penerimaan ditolak.",
  },
  {
    id: "S7",
    name: "Satu merek keluar",
    description: "Ruang Kaos keluar; bandingkan biaya merek yang tersisa.",
  },
];
export function runScenario(
  id: string,
  brands: Brand[],
  p: CostParameters,
  options: SimOptions,
) {
  const o = {
    ...options,
    multiplier: id === "S2" ? 0.15 : options.multiplier,
    promo: id === "S3",
    incident: id === "S4",
    leaveBrand: id === "S7" ? "b1" : undefined,
  };
  const result = simulate(brands, p, o),
    messages: string[] = [];
  if (id === "S5" || id === "S6") {
    const r = seedNetwork(new Date("2026-10-18T03:00:00Z")).returns[70],
      at = "2026-10-18T04:00:00Z";
    if (id === "S5") {
      const different = receive(r, r.qr, "BARANG-LAIN", at);
      messages.push(
        `Barang berbeda → ${different.status}; QR terpakai; pemberitahuan merek tercatat pada riwayat.`,
      );
      for (const test of [
        () => receive(undefined, "TIDAK-ADA", "X", at),
        () => receive(different, r.qr, r.item.id, at),
      ])
        try {
          test();
        } catch (e) {
          messages.push((e as Error).message);
        }
    } else {
      try {
        receive(r, r.qr, r.item.id, "2026-11-01T03:00:00Z");
      } catch (e) {
        messages.push((e as Error).message);
      }
      messages.push(
        `Otorisasi hangus → ${transition(r, "qr_kedaluwarsa", "2026-11-01T03:00:00Z").status}.`,
      );
    }
  }
  if (id === "S4")
    messages.push(
      `Insiden pertama: ${result.records[0]?.id} → ${result.records[0]?.status}; nilai barang dicatat sebagai kerugian aktual.`,
    );
  return { result, messages, options: o };
}
