import { assumptions } from "../config/assumptions";
import type { Brand, Network, Status } from "./types";
export const brands: Brand[] = [
  {
    id: "b1",
    name: "Ruang Kaos",
    category: "kaos",
    weeklyMean: 12,
    weight: 0.25,
    volume: 1.5,
    value: 125000,
    currentCost: 28000,
    policy: {
      days: 14,
      categories: ["kaos"],
      condition: "Label terpasang, belum dipakai",
    },
    address: "Jl. Cihampelas 12, Bandung",
  },
  {
    id: "b2",
    name: "Sela Hijab",
    category: "hijab",
    weeklyMean: 10,
    weight: 0.15,
    volume: 1,
    value: 95000,
    currentCost: 25000,
    policy: {
      days: 7,
      categories: ["hijab"],
      condition: "Bersih, label dan kelengkapan utuh",
    },
    address: "Jl. Dago 24, Bandung",
  },
  {
    id: "b3",
    name: "Utara Studio",
    category: "jaket",
    weeklyMean: 8,
    weight: 0.8,
    volume: 5,
    value: 350000,
    currentCost: 35000,
    policy: {
      days: 14,
      categories: ["jaket"],
      condition: "Belum dipakai, ritsleting utuh",
    },
    address: "Jl. Dipatiukur 8, Bandung",
  },
  {
    id: "b4",
    name: "Langkah Lokal",
    category: "sepatu",
    weeklyMean: 7,
    weight: 1.1,
    volume: 8,
    value: 425000,
    currentCost: 40000,
    policy: {
      days: 7,
      categories: ["sepatu"],
      condition: "Sol bersih, sepasang lengkap",
    },
    address: "Jl. Tamansari 30, Bandung",
  },
  {
    id: "b5",
    name: "Temu Aksesori",
    category: "aksesori",
    weeklyMean: 5,
    weight: 0.1,
    volume: 0.5,
    value: 80000,
    currentCost: 24000,
    policy: {
      days: 7,
      categories: ["aksesori"],
      condition: "Segel dan kelengkapan utuh",
    },
    address: "Jl. Riau 9, Bandung",
  },
];
export function seedNetwork(now = new Date()): Network {
  const n: Network = {
    version: 0,
    brands: structuredClone(brands),
    buyers: [],
    orders: [],
    returns: [],
    batches: [],
    parameters: structuredClone(assumptions),
    notices: ["Data demo sintetis: 80 retur. Semua biaya adalah asumsi."],
  };
  for (let i = 0; i < 80; i++) {
    const b = brands[i % 5],
      id = `RT-${String(i + 1).padStart(4, "0")}`;
    const historical = i < 60,
      at = new Date(
        now.getTime() - (historical ? 14 + (i % 14) : 1) * 86400000,
      ).toISOString();
    const status: Status = historical
      ? "selesai"
      : i < 70
        ? "diajukan"
        : "qr_terbit";
    n.buyers.push({
      id: `buyer-${i}`,
      code: `P${i + 1}`,
      zone: "Bandung Utara",
    });
    n.orders.push({
      id: `ORD-${1000 + i}`,
      brandId: b.id,
      buyerId: `buyer-${i}`,
      items: [`${b.category}-${i}`],
      purchasedAt: at,
      value: b.value,
    });
    const receipt = {
      id: `receipt-${i}`,
      authorizationId: id,
      receivedAt: new Date(Date.parse(at) + 86400000).toISOString(),
      operator: "Operator demo",
      match: "sesuai_otorisasi" as const,
    };
    n.returns.push({
      id,
      orderId: `ORD-${1000 + i}`,
      brandId: b.id,
      reason: i % 2 ? "Ukuran tidak sesuai" : "Warna tidak sesuai",
      status,
      deadline: new Date(now.getTime() + 7 * 86400000).toISOString(),
      qr: `RR-${id}`,
      qrExpiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      qrUsed: historical,
      item: {
        id: `${b.category}-${i}`,
        authorizationId: id,
        category: b.category,
        weight: b.weight,
        volume: b.volume,
        value: b.value,
      },
      approvedAt: status === "diajukan" ? undefined : at,
      ...(historical
        ? {
            receipt,
            inspection: {
              id: `inspection-${i}`,
              receiptId: receipt.id,
              checklist: {
                label_ada: true,
                bekas_pakai: false,
                noda: false,
                kerusakan: false,
                kelengkapan: true,
                bau: false,
              },
              photos: [`depan-${i}.jpg`, `belakang-${i}.jpg`],
              decision:
                i % 10 === 0
                  ? ("rusak" as const)
                  : i % 6 === 0
                    ? ("perlu_perbaikan" as const)
                    : ("layak_jual" as const),
              minutes: assumptions.inspectionMinutes[b.category],
            },
            receivedByBrandAt: new Date(
              Date.parse(at) + 4 * 86400000,
            ).toISOString(),
            settlement: {
              authorizationId: id,
              status: "refund_diproses" as const,
              completedAt: new Date(
                Date.parse(at) + 5 * 86400000,
              ).toISOString(),
            },
          }
        : {}),
      history: historical
        ? [
            { status: "diajukan", at },
            {
              status: "selesai",
              at: new Date(Date.parse(at) + 5 * 86400000).toISOString(),
              note: "Riwayat ringkas impor demo",
            },
          ]
        : [{ status, at }],
    });
  }
  return n;
}
