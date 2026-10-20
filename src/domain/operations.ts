import { z } from "zod";
import { DAY, planBatches } from "./batches";
import { dispute, inspect, receive, transition } from "./state";
import type { Decision, Network } from "./types";
import { parameterSchema } from "./validation";
export { parameterSchema } from "./validation";
export type Action = { type: string; id?: string; [key: string]: unknown };
const str = (v: unknown) => z.string().trim().min(1).max(500).parse(v);
export function applyAction(
  input: Network,
  action: Action,
  now = new Date(),
): Network {
  const n = structuredClone(input),
    p = n.parameters;
  const realAt = now.toISOString();
  const index = n.returns.findIndex((r) => r.id === action.id);
  const r = n.returns[index];
  const at = new Date(
    Math.max(now.getTime(), Date.parse(r?.history.at(-1)?.at ?? realAt)),
  ).toISOString();
  switch (action.type) {
    case "parameters":
      n.parameters = parameterSchema.parse(action.parameters);
      break;
    case "means": {
      const means = z
        .record(z.string(), z.number().min(0.1).max(100))
        .parse(action.means);
      for (const b of n.brands) b.weeklyMean = means[b.id] ?? b.weeklyMean;
      break;
    }
    case "policy": {
      const b = n.brands.find((b) => b.id === action.id);
      if (!b) throw Error("Merek tidak ditemukan.");
      b.policy.days = z.number().int().min(1).max(90).parse(action.days);
      b.policy.condition = str(action.condition);
      b.currentCost = z
        .number()
        .min(0)
        .max(1000000)
        .parse(action.currentCost ?? b.currentCost);
      break;
    }
    case "submit": {
      const order = n.orders.find((o) => o.id === action.orderId);
      if (!order) throw Error("Kode pesanan tidak ditemukan pada data demo.");
      const b = n.brands.find((b) => b.id === order.brandId)!;
      if (now.getTime() - Date.parse(order.purchasedAt) > b.policy.days * DAY)
        throw Error("Pesanan melewati batas hari kebijakan retur.");
      if (!order.items.includes(str(action.itemId)))
        throw Error("Barang tidak ada pada pesanan.");
      if (
        n.returns.some(
          (r) =>
            r.orderId === order.id &&
            r.item.id === action.itemId &&
            !["ditolak_merek", "qr_kedaluwarsa"].includes(r.status),
        )
      )
        throw Error(
          "Barang sudah memiliki pengajuan retur aktif atau selesai.",
        );
      const id = `RT-${now.getTime()}-${n.version}`;
      n.returns.push({
        id,
        orderId: order.id,
        brandId: b.id,
        reason: str(action.reason),
        status: "diajukan",
        deadline: new Date(now.getTime() + 7 * DAY).toISOString(),
        qr: `RR-${id}`,
        qrExpiresAt: new Date(now.getTime() + 7 * DAY).toISOString(),
        qrUsed: false,
        item: {
          id: str(action.itemId),
          authorizationId: id,
          category: b.category,
          weight: b.weight,
          volume: b.volume,
          value: b.value,
        },
        history: [{ status: "diajukan", at }],
      });
      break;
    }
    case "demoOrder": {
      const b = n.brands.find((b) => b.id === action.id);
      if (!b) throw Error("Merek tidak ditemukan.");
      const id = `ORD-${now.getTime()}-${n.version}`;
      n.buyers.push({
        id: `P-${id}`,
        code: str(action.initials).slice(0, 3).toUpperCase(),
        zone: "Bandung Utara",
      });
      n.orders.push({
        id,
        brandId: b.id,
        buyerId: `P-${id}`,
        items: [`${b.category}-${id}`],
        purchasedAt: at,
        value: b.value,
      });
      break;
    }
    case "approve": {
      if (!r) throw Error("Retur tidak ditemukan.");
      const b = n.brands.find((b) => b.id === r.brandId)!;
      if (!b.policy.categories.includes(r.item.category))
        throw Error("Kategori tidak diizinkan.");
      const a = transition(r, "disetujui_merek", at);
      n.returns[index] = {
        ...transition(a, "qr_terbit", at),
        approvedAt: at,
        deadline: new Date(Date.parse(at) + 7 * DAY).toISOString(),
        qrExpiresAt: new Date(Date.parse(at) + 7 * DAY).toISOString(),
      };
      break;
    }
    case "reject":
      if (!r) throw Error("Retur tidak ditemukan.");
      n.returns[index] = transition(r, "ditolak_merek", at);
      break;
    case "receive": {
      const i = n.returns.findIndex((r) => r.qr === action.qr),
        r = n.returns[i];
      const result = receive(r, str(action.qr), str(action.itemId), at);
      n.returns[i] = result;
      if (result.status === "tidak_sesuai")
        n.notices.unshift(
          `${result.id}: barang berbeda dari otorisasi. Merek ${result.brandId} perlu meninjau.`,
        );
      break;
    }
    case "inspect":
      if (!r) throw Error("Retur tidak ditemukan.");
      n.returns[index] = inspect(
        r,
        z.record(z.string(), z.boolean()).parse(action.checklist),
        z.array(z.string().min(1).max(200)).max(20).parse(action.photos),
        z
          .enum(["layak_jual", "perlu_perbaikan", "rusak", "tidak_sesuai"])
          .parse(action.decision) as Decision,
        p,
        at,
      );
      break;
    case "queue":
      if (!r) throw Error("Retur tidak ditemukan.");
      if (
        r.receipt?.match !== "sesuai_otorisasi" ||
        !r.inspection ||
        r.inspection.decision === "tidak_sesuai"
      )
        throw Error("Barang tidak sesuai harus ditahan.");
      n.returns[index] = transition(r, "menunggu_batch", at);
      break;
    case "hold":
      if (!r) throw Error("Retur tidak ditemukan.");
      n.returns[index] = transition(r, "ditahan", at);
      break;
    case "plan": {
      const result = planBatches(n.returns, p, at, n.batches);
      n.returns = result.records;
      n.batches = result.batches;
      break;
    }
    case "ship":
    case "arrive": {
      const b = n.batches.find((b) => b.id === action.id);
      if (!b) throw Error("Batch tidak ditemukan.");
      if (
        (action.type === "ship" && b.status !== "terencana") ||
        (action.type === "arrive" && b.status !== "dikirim")
      )
        throw Error("Status batch tidak sah.");
      // Button explicitly simulates arrival at the scheduled future time.
      const effective = new Date(
        Math.max(
          now.getTime(),
          Date.parse(
            action.type === "arrive"
              ? (b.shippedAt ?? b.scheduledAt)
              : b.scheduledAt,
          ) + (action.type === "arrive" ? 2 * DAY : 0),
        ),
      ).toISOString();
      for (let i = 0; i < n.returns.length; i++) {
        const x = n.returns[i];
        if (
          x.batchId !== b.id ||
          x.incident ||
          x.status === "sengketa" ||
          x.status === "selesai"
        )
          continue;
        let updated = transition(
          x,
          action.type === "ship" ? "dikirim_balik" : "diterima_merek",
          effective,
        );
        if (action.type === "ship")
          updated.waitingDays =
            (Date.parse(effective) - Date.parse(x.receipt!.receivedAt)) / DAY;
        if (action.type === "arrive")
          updated = {
            ...updated,
            receivedByBrandAt: effective,
            settlement: { authorizationId: x.id, status: "diterima_merek" },
          };
        n.returns[i] = updated;
      }
      b.status = action.type === "ship" ? "dikirim" : "diterima";
      if (action.type === "ship") b.shippedAt = effective;
      else b.arrivedAt = effective;
      break;
    }
    case "finish":
      if (!r) throw Error("Retur tidak ditemukan.");
      if (r.status !== "diterima_merek")
        throw Error("Sengketa memerlukan keputusan penyelesaian tersendiri.");
      {
        const finishedAt = new Date(
          Math.max(now.getTime(), Date.parse(r.history.at(-1)?.at ?? at)),
        ).toISOString();
        n.returns[index] = {
          ...transition(r, "selesai", finishedAt),
          settlement: {
            authorizationId: r.id,
            status: "refund_diproses",
            completedAt: finishedAt,
          },
        };
      }
      break;
    case "dispute":
      if (!r) throw Error("Retur tidak ditemukan.");
      n.returns[index] = dispute(
        r,
        str(action.reason),
        z.array(z.string().min(1)).min(1).parse(action.photos),
        p,
        at,
      );
      n.notices.unshift(`${r.id}: gugatan merek dibuka.`);
      break;
    case "incident":
      if (!r) throw Error("Retur tidak ditemukan.");
      if (!["dikonsolidasi", "dikirim_balik"].includes(r.status))
        throw Error(
          "Insiden hanya dicatat selama konsolidasi atau pengiriman.",
        );
      n.returns[index] = {
        ...transition(r, "sengketa", at, "Insiden konsolidasi"),
        incident: z.enum(["rusak", "hilang"]).parse(action.incident),
        actualLoss: r.item.value,
        settlement: { authorizationId: r.id, status: "sengketa" },
      };
      n.notices.unshift(
        `${r.id}: insiden ${action.incident}; kerugian Rp${r.item.value}.`,
      );
      break;
    case "escalate":
      if (!r) throw Error("Retur tidak ditemukan.");
      if (!["tidak_sesuai", "ditahan"].includes(r.status))
        throw Error(
          "Hanya barang tidak sesuai atau ditahan yang dapat dieskalasi.",
        );
      n.returns[index] = {
        ...transition(r, "sengketa", at, str(action.reason)),
        settlement: { authorizationId: r.id, status: "sengketa" },
      };
      n.notices.unshift(`${r.id}: memerlukan keputusan merek.`);
      break;
    case "resolve": {
      if (!r || r.status !== "sengketa")
        throw Error("Sengketa tidak ditemukan.");
      const outcome = z
        .enum(["refund_diproses", "ditolak"])
        .parse(action.outcome);
      const resolution = str(action.reason);
      n.returns[index] = {
        ...transition(r, "selesai", at, resolution),
        settlement: {
          authorizationId: r.id,
          status: outcome,
          completedAt: at,
          resolution,
        },
      };
      break;
    }
    case "expire":
      for (let i = 0; i < n.returns.length; i++) {
        const x = n.returns[i];
        if (
          x.status === "qr_terbit" &&
          Math.min(Date.parse(x.qrExpiresAt), Date.parse(x.deadline)) <=
            now.getTime()
        )
          n.returns[i] = transition(x, "qr_kedaluwarsa", at);
      }
      break;
    default:
      throw Error("Aksi tidak dikenal.");
  }
  n.version++;
  return n;
}
