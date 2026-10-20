import { z } from "zod";
import { parameterSchema } from "./validation";
const text = z.string(),
  time = text.refine((value) => Number.isFinite(Date.parse(value))),
  nonnegative = z.number().nonnegative();
const category = z.enum(["kaos", "hijab", "jaket", "sepatu", "aksesori"]);
const status = z.enum([
  "diajukan",
  "disetujui_merek",
  "ditolak_merek",
  "qr_terbit",
  "qr_kedaluwarsa",
  "diserahkan_di_titik",
  "tidak_sesuai",
  "ditahan",
  "diperiksa",
  "menunggu_batch",
  "dikonsolidasi",
  "dikirim_balik",
  "diterima_merek",
  "selesai",
  "sengketa",
]);
const record = z.object({
  id: text,
  orderId: text,
  brandId: text,
  reason: text,
  status,
  deadline: time,
  qr: text,
  qrExpiresAt: time,
  qrUsed: z.boolean(),
  item: z.object({
    id: text,
    authorizationId: text,
    category,
    weight: z.number().positive(),
    volume: z.number().positive(),
    value: nonnegative,
  }),
  approvedAt: time.optional(),
  receivedByBrandAt: time.optional(),
  receipt: z
    .object({
      id: text,
      authorizationId: text,
      receivedAt: time,
      operator: text,
      match: z.enum(["sesuai_otorisasi", "berbeda", "tanpa_otorisasi"]),
    })
    .optional(),
  inspection: z
    .object({
      id: text,
      receiptId: text,
      checklist: z.record(z.string(), z.boolean()),
      photos: z.array(text),
      decision: z.enum([
        "layak_jual",
        "perlu_perbaikan",
        "rusak",
        "tidak_sesuai",
      ]),
      minutes: nonnegative,
    })
    .optional(),
  settlement: z
    .object({
      authorizationId: text,
      status: z.enum([
        "menunggu_merek",
        "diterima_merek",
        "refund_diproses",
        "ditolak",
        "sengketa",
      ]),
      completedAt: time.optional(),
      resolution: text.optional(),
    })
    .optional(),
  batchId: text.optional(),
  waitingDays: nonnegative.optional(),
  incident: z.enum(["rusak", "hilang"]).optional(),
  actualLoss: nonnegative.optional(),
  dispute: z
    .object({ reason: text, brandPhotos: z.array(text), openedAt: time })
    .optional(),
  history: z.array(z.object({ status, at: time, note: text.optional() })),
});
export const networkSchema = z.object({
  version: nonnegative.int(),
  brands: z
    .array(
      z.object({
        id: text,
        name: text,
        policy: z.object({
          days: z.number().positive().int(),
          categories: z.array(category),
          condition: text,
        }),
        address: text,
        currentCost: nonnegative,
        weeklyMean: z.number().positive(),
        category,
        weight: z.number().positive(),
        volume: z.number().positive(),
        value: nonnegative,
      }),
    )
    .min(1),
  buyers: z.array(z.object({ id: text, code: text, zone: text })),
  orders: z.array(
    z.object({
      id: text,
      brandId: text,
      buyerId: text,
      items: z.array(text),
      purchasedAt: time,
      value: nonnegative,
    }),
  ),
  returns: z.array(record),
  batches: z.array(
    z.object({
      id: text,
      brandId: text,
      scheduledAt: time,
      cutoffAt: time,
      itemIds: z.array(text),
      weight: nonnegative,
      volume: nonnegative,
      status: z.enum(["terencana", "dikirim", "diterima"]),
      freight: nonnegative,
      capacityKg: z.number().positive().optional(),
      capacityVolume: z.number().positive().optional(),
      freightFixed: nonnegative.optional(),
      freightPerKg: nonnegative.optional(),
      packagingPerBatch: nonnegative.optional(),
      shippedAt: time.optional(),
      arrivedAt: time.optional(),
    }),
  ),
  parameters: parameterSchema,
  notices: z.array(text),
});
