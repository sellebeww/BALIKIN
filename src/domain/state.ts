import type { CostParameters, Decision, ReturnRecord, Status } from "./types";
const edges: Record<Status, Status[]> = {
  diajukan: ["disetujui_merek", "ditolak_merek"],
  disetujui_merek: ["qr_terbit"],
  ditolak_merek: [],
  qr_terbit: ["diserahkan_di_titik", "qr_kedaluwarsa", "tidak_sesuai"],
  qr_kedaluwarsa: [],
  diserahkan_di_titik: ["diperiksa", "ditahan"],
  tidak_sesuai: ["ditahan", "sengketa"],
  ditahan: ["diperiksa", "sengketa"],
  diperiksa: ["menunggu_batch", "ditahan"],
  menunggu_batch: ["dikonsolidasi"],
  dikonsolidasi: ["dikirim_balik", "sengketa"],
  dikirim_balik: ["diterima_merek", "sengketa"],
  diterima_merek: ["selesai", "sengketa"],
  selesai: ["sengketa"],
  sengketa: ["selesai"],
};
export function timestamp(value: string): number {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw Error("Waktu tidak valid.");
  return result;
}
export function transition(
  r: ReturnRecord,
  to: Status,
  at: string,
  note?: string,
): ReturnRecord {
  if (!edges[r.status]?.includes(to))
    throw Error(`Transisi ${r.status} → ${to} tidak sah.`);
  if (timestamp(at) < timestamp(r.history.at(-1)?.at ?? at))
    throw Error("Waktu kejadian tidak boleh mendahului riwayat terakhir.");
  return {
    ...r,
    status: to,
    history: [...r.history, { status: to, at, note }],
  };
}
export function receive(
  r: ReturnRecord | undefined,
  qr: string,
  itemId: string,
  at: string,
): ReturnRecord {
  if (!r || r.qr !== qr) throw Error("Tanpa otorisasi: QR tidak dikenal.");
  if (r.qrUsed) throw Error("QR sudah terpakai. Penerimaan ditolak.");
  if (
    timestamp(at) >= Math.min(timestamp(r.qrExpiresAt), timestamp(r.deadline))
  )
    throw Error("QR kedaluwarsa. Penerimaan ditolak.");
  const match = r.item.id === itemId;
  return {
    ...transition(
      r,
      match ? "diserahkan_di_titik" : "tidak_sesuai",
      at,
      match ? "Barang sesuai otorisasi" : "Barang berbeda; merek diberi tahu",
    ),
    qrUsed: true,
    receipt: {
      id: `P-${r.id}`,
      authorizationId: r.id,
      receivedAt: at,
      operator: "Operator titik",
      match: match ? "sesuai_otorisasi" : "berbeda",
    },
  };
}
export function photoNames(photos: string[]): string[] {
  return [...new Set(photos.map((p) => p.trim()).filter(Boolean))];
}
export function inspect(
  r: ReturnRecord,
  checklist: Record<string, boolean>,
  photos: string[],
  decision: Decision,
  p: CostParameters,
  at: string,
): ReturnRecord {
  if (!r.receipt) throw Error("Penerimaan belum tercatat.");
  if (r.receipt.match !== "sesuai_otorisasi")
    throw Error(
      "Barang berbeda tidak boleh diperiksa sebagai barang yang diotorisasi. Eskalasi ke merek.",
    );
  const normalized = photoNames(photos);
  if (normalized.length < p.minPhotos)
    throw Error(
      `Minimal ${p.minPhotos} foto kondisi berbeda wajib disertakan.`,
    );
  const extra =
    r.item.category === "sepatu"
      ? ["sol_bersih"]
      : r.item.category === "jaket"
        ? ["ritsleting_utuh"]
        : [];
  const required = [
    "label_ada",
    "bekas_pakai",
    "noda",
    "kerusakan",
    "kelengkapan",
    "bau",
    ...extra,
  ];
  if (required.some((k) => typeof checklist[k] !== "boolean"))
    throw Error("Checklist kategori belum lengkap.");
  if (
    decision === "layak_jual" &&
    (!checklist.label_ada ||
      !checklist.kelengkapan ||
      checklist.bekas_pakai ||
      checklist.noda ||
      checklist.kerusakan ||
      checklist.bau ||
      extra.some((k) => !checklist[k]))
  )
    throw Error("Keputusan layak jual bertentangan dengan checklist.");
  return {
    ...transition(r, "diperiksa", at),
    inspection: {
      id: `I-${r.id}`,
      receiptId: r.receipt.id,
      checklist: Object.fromEntries(required.map((k) => [k, checklist[k]])),
      photos: normalized,
      decision,
      minutes: p.inspectionMinutes[r.item.category],
    },
  };
}
export function dispute(
  r: ReturnRecord,
  reason: string,
  photos: string[],
  p: CostParameters,
  at: string,
): ReturnRecord {
  if (!r.receivedByBrandAt)
    throw Error("Gugatan pemeriksaan dibuka setelah merek menerima barang.");
  if (timestamp(at) < timestamp(r.receivedByBrandAt))
    throw Error("Merek belum menerima barang pada waktu tersebut.");
  if (timestamp(at) > timestamp(r.receivedByBrandAt) + p.disputeDays * 86400000)
    throw Error("Batas waktu gugatan telah berakhir.");
  const normalized = photoNames(photos);
  if (
    !reason.trim() ||
    !normalized.length ||
    !photoNames(r.inspection?.photos ?? []).length
  )
    throw Error("Alasan dan foto kedua pihak wajib tersedia.");
  return {
    ...transition(r, "sengketa", at),
    dispute: { reason: reason.trim(), brandPhotos: normalized, openedAt: at },
    settlement: { authorizationId: r.id, status: "sengketa" },
  };
}
