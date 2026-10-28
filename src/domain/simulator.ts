import { DAY, nextSchedule } from "./batches";
import { compareModes, costModel, type CostGroup } from "./cost";
import { inspect, receive, transition } from "./state";
import type { Brand, CostParameters, ReturnRecord } from "./types";
import { parameterSchema } from "./validation";
function random(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function stream(seed: number, key: string) {
  let hash = seed | 0;
  for (const c of key) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return random(hash);
}
function poisson(mean: number, rng: () => number) {
  if (!Number.isFinite(mean) || mean < 0 || mean > 10000)
    throw Error("Rerata Poisson tidak valid.");
  let remaining = mean,
    total = 0;
  while (remaining > 0) {
    const chunk = Math.min(remaining, 20),
      limit = Math.exp(-chunk);
    let k = 0,
      product = 1;
    do {
      k++;
      product *= rng();
    } while (product > limit);
    total += k - 1;
    remaining -= chunk;
  }
  return total;
}
export interface SimOptions {
  seed: number;
  weeks: number;
  multiplier: number;
  schedules: number;
  promo: boolean;
  leaveBrand?: string;
  incident?: boolean;
}
export function percentile(values: number[], q: number) {
  if (!values.length) return 0;
  const a = [...values].sort((a, b) => a - b);
  return a[Math.min(a.length - 1, Math.floor((a.length - 1) * q))];
}
/** FIFO server. Productive capacity is spread over an eight-hour opening window. */
export function scheduleWork(
  arrivals: { at: number; minutes: number }[],
  capacity: number,
  opening: number,
) {
  if (!Number.isFinite(capacity) || capacity <= 0)
    throw Error("Kapasitas operator harus positif.");
  let available = opening;
  return arrivals.map((job) => {
    if (
      !Number.isFinite(job.at) ||
      !Number.isFinite(job.minutes) ||
      job.minutes <= 0
    )
      throw Error("Pekerjaan antrean tidak valid.");
    let cursor = Math.max(job.at, available),
      remaining = job.minutes,
      started: number | undefined;
    while (remaining > 1e-9) {
      const day = Math.floor((cursor - opening) / DAY),
        open = opening + day * DAY,
        close = open + 8 * 3600000;
      if (cursor >= close) {
        cursor = open + DAY;
        continue;
      }
      cursor = Math.max(cursor, open);
      started ??= cursor;
      const work = Math.min(
        remaining,
        ((close - cursor) / (8 * 3600000)) * capacity,
      );
      cursor += (work / capacity) * 8 * 3600000;
      remaining -= work;
    }
    available = cursor;
    return {
      started: started!,
      finished: cursor,
      queueDays: (started! - job.at) / DAY,
    };
  });
}
export function simulate(brands: Brand[], p: CostParameters, o: SimOptions) {
  parameterSchema.parse(p);
  if (
    !Number.isInteger(o.seed) ||
    !Number.isInteger(o.weeks) ||
    o.weeks < 1 ||
    o.weeks > 12 ||
    ![1, 2, 3].includes(o.schedules) ||
    !Number.isFinite(o.multiplier) ||
    o.multiplier < 0 ||
    o.multiplier > 4
  )
    throw Error(
      "Opsi simulasi tidak valid: 1–12 minggu, 1–3 jadwal, pengali 0–4, seed bilangan bulat.",
    );
  const active = brands.filter((b) => b.id !== o.leaveBrand),
    start = Date.parse("2026-10-05T02:00:00.000Z");
  if (!active.length) throw Error("Simulasi memerlukan setidaknya satu merek.");
  const weekdays =
    o.schedules === 1 ? [5] : o.schedules === 3 ? [1, 3, 5] : [2, 5];
  const arrivals: { b: Brand; at: number; id: string }[] = [];
  for (let w = 0; w < o.weeks; w++)
    for (const b of active) {
      if (b.weight > p.batchKg || b.volume > p.batchVolume)
        throw Error("Barang melebihi kapasitas batch.");
      const rng = stream(o.seed, `${b.id}:week:${w}`),
        n = poisson(
          b.weeklyMean * o.multiplier * (o.promo && w === 1 ? 6 : 1),
          rng,
        );
      for (let j = 0; j < n; j++)
        arrivals.push({
          b,
          at:
            start + (w * 7 + Math.floor(rng() * 7)) * DAY + rng() * 4 * 3600000,
          id: `SIM-${b.id}-${w}-${j}`,
        });
    }
  arrivals.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const work = scheduleWork(
    arrivals.map((a) => ({
      at: a.at,
      minutes: p.receivingMinutes + p.inspectionMinutes[a.b.category],
    })),
    p.operatorMinutesPerDay,
    start,
  );
  const queueEvents = work
    .flatMap((w, i) =>
      w.started > arrivals[i].at
        ? [
            { at: arrivals[i].at, delta: 1 },
            { at: w.started, delta: -1 },
          ]
        : [],
    )
    .sort((a, b) => a.at - b.at || a.delta - b.delta);
  let queue = 0,
    maxQueue = 0;
  for (const e of queueEvents) {
    queue += e.delta;
    maxQueue = Math.max(queue, maxQueue);
  }
  const groups: CostGroup[] = active.map((b) => ({
    brandId: b.id,
    items: [],
    batches: 0,
    waitingDays: 0,
  }));
  const loads: { brandId: string; at: string; kg: number; volume: number }[] =
      [],
    times: number[] = [],
    records: ReturnRecord[] = [];
  let incidents = 0,
    actualLoss = 0;
  for (let i = 0; i < arrivals.length; i++) {
    const { b, at, id } = arrivals[i],
      ready = work[i].finished,
      schedule = nextSchedule(
        new Date(ready).toISOString(),
        p.cutoffHours,
        weekdays,
      );
    let load = loads.find(
      (l) =>
        l.brandId === b.id &&
        l.at === schedule &&
        l.kg + b.weight <= p.batchKg + 1e-9 &&
        l.volume + b.volume <= p.batchVolume + 1e-9,
    );
    if (!load) {
      load = { brandId: b.id, at: schedule, kg: 0, volume: 0 };
      loads.push(load);
    }
    load.kg += b.weight;
    load.volume += b.volume;
    const approved = new Date(at - DAY).toISOString(),
      received = new Date(at).toISOString(),
      readyAt = new Date(ready).toISOString();
    let r: ReturnRecord = {
      id,
      orderId: id,
      brandId: b.id,
      reason: "Simulasi",
      status: "diajukan",
      deadline: new Date(at + 7 * DAY).toISOString(),
      qr: id,
      qrExpiresAt: new Date(at + 7 * DAY).toISOString(),
      qrUsed: false,
      item: {
        id,
        authorizationId: id,
        category: b.category,
        weight: b.weight,
        volume: b.volume,
        value: b.value,
      },
      history: [{ status: "diajukan", at: approved }],
      approvedAt: approved,
    };
    r = transition(r, "disetujui_merek", approved);
    r = transition(r, "qr_terbit", approved);
    r = receive(r, id, id, received);
    const rng = stream(o.seed, `${id}:quality`),
      quality = rng(),
      decision =
        quality < p.baselineResellable
          ? "layak_jual"
          : quality < p.baselineResellable + (1 - p.baselineResellable) * 0.6875
            ? "perlu_perbaikan"
            : "rusak";
    r = inspect(
      r,
      {
        label_ada: true,
        bekas_pakai: false,
        noda: false,
        kerusakan: decision === "rusak",
        kelengkapan: true,
        bau: false,
        sol_bersih: true,
        ritsleting_utuh: true,
      },
      Array.from({ length: p.minPhotos }, (_, n) => `foto-${n}.jpg`),
      decision,
      p,
      readyAt,
    );
    r = transition(r, "menunggu_batch", readyAt);
    r = transition(r, "dikonsolidasi", readyAt);
    r = transition(r, "dikirim_balik", schedule);
    const risk = rng(),
      incident =
        o.incident && i === 0
          ? "rusak"
          : risk < p.lossProbability
            ? "hilang"
            : risk < p.lossProbability + p.damageProbability
              ? "rusak"
              : undefined;
    if (incident) {
      incidents++;
      actualLoss += b.value;
      r = {
        ...transition(r, "sengketa", schedule, "Insiden konsolidasi"),
        incident,
        actualLoss: b.value,
        settlement: { authorizationId: r.id, status: "sengketa" },
      };
    } else {
      const done = new Date(Date.parse(schedule) + 2 * DAY).toISOString();
      r = transition(r, "diterima_merek", done);
      r.receivedByBrandAt = done;
      r = transition(r, "selesai", done);
      r.settlement = {
        authorizationId: r.id,
        status: "refund_diproses",
        completedAt: done,
      };
      times.push((Date.parse(done) - Date.parse(approved)) / DAY);
    }
    records.push(r);
    const g = groups.find((g) => g.brandId === b.id)!;
    g.items.push(r.item);
    g.waitingDays += (Date.parse(schedule) - at) / DAY;
  }
  for (const g of groups)
    g.batches = loads.filter((l) => l.brandId === g.brandId).length;
  const lastDispatch = loads.reduce(
      (last, l) => Math.max(last, Date.parse(l.at)),
      start,
    ),
    operatingWeeks = Math.max(
      o.weeks,
      Math.ceil((lastDispatch - start) / DAY / 7),
    );
  const costs = costModel(groups, p, operatingWeeks),
    averageDays = times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : null;
  return {
    costs,
    groups,
    records,
    count: arrivals.length,
    completed: times.length,
    operatingWeeks,
    weeklyVolume: arrivals.length / o.weeks,
    averageDays,
    p90Days: times.length ? percentile(times, 0.9) : null,
    maxQueue,
    averageQueueDays: work.length
      ? work.reduce((s, w) => s + w.queueDays, 0) / work.length
      : 0,
    utilizationKg: loads.length
      ? loads.reduce((s, l) => s + l.kg / p.batchKg, 0) / loads.length
      : 0,
    utilizationVolume: loads.length
      ? loads.reduce((s, l) => s + l.volume / p.batchVolume, 0) / loads.length
      : 0,
    halfEmpty: loads.filter(
      (l) => Math.max(l.kg / p.batchKg, l.volume / p.batchVolume) < 0.5,
    ).length,
    batchCount: loads.length,
    incidents,
    actualLoss,
    comparison: compareModes(
      groups,
      active,
      p,
      o.weeks,
      averageDays,
      operatingWeeks,
    ),
    resellable: records.length
      ? records.filter(
          (r) => r.inspection?.decision === "layak_jual" && !r.incident,
        ).length / records.length
      : 0,
  };
}
export function realizedCost(s: ReturnType<typeof simulate>) {
  if (!s.count) return null;
  const expected = s.costs.byBrand.reduce((a, b) => a + b.parts.risk, 0);
  return (s.costs.total - expected + s.actualLoss) / s.count;
}
export function summarizeMonteCarlo(costs: number[], runs: number) {
  return {
    low: costs.length ? percentile(costs, 0.05) : null,
    median: costs.length ? percentile(costs, 0.5) : null,
    high: costs.length ? percentile(costs, 0.95) : null,
    runs,
    empty: runs - costs.length,
  };
}
export function monteCarlo(
  brands: Brand[],
  p: CostParameters,
  o: SimOptions,
  runs = 200,
) {
  if (!Number.isInteger(runs) || runs < 1 || runs > 1000)
    throw Error("Jumlah putaran tidak valid.");
  const costs: number[] = [];
  for (let i = 0; i < runs; i++) {
    const cost = realizedCost(
      simulate(brands, p, { ...o, seed: o.seed + i * 7919 }),
    );
    if (cost !== null) costs.push(cost);
  }
  return summarizeMonteCarlo(costs, runs);
}
