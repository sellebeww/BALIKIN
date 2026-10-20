import type { Brand, CostParameters, Item } from "./types";
export interface CostGroup {
  brandId: string;
  items: Item[];
  batches: number;
  waitingDays: number;
}
export function costModel(groups: CostGroup[], p: CostParameters, weeks = 1) {
  const count = groups.reduce((s, g) => s + g.items.length, 0);
  const fixed = (p.weeklyRent + p.weeklyEquipment) * weeks;
  const byBrand = groups.map((g) => {
    const n = g.items.length;
    const parts = {
      labor: g.items.reduce(
        (s, i) =>
          s +
          (p.receivingMinutes + p.inspectionMinutes[i.category]) *
            p.wagePerMinute,
        0,
      ),
      fixed: count ? (fixed * n) / count : 0,
      packaging: g.batches * p.packagingPerBatch + n * p.packagingPerItem,
      freight:
        g.batches * p.freightFixed +
        g.items.reduce((s, i) => s + i.weight * p.freightPerKg, 0),
      risk: g.items.reduce(
        (s, i) => s + i.value * (p.damageProbability + p.lossProbability),
        0,
      ),
      storage: g.waitingDays * p.storagePerDay,
      platform: n * p.platformPerItem,
    };
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    return {
      brandId: g.brandId,
      count: n,
      parts,
      total,
      perReturn: n ? total / n : null,
    };
  });
  const total = count ? byBrand.reduce((s, b) => s + b.total, 0) : fixed;
  return {
    count,
    total,
    perReturn: count ? total / count : null,
    breakEvenFee: count ? total / count : null,
    byBrand,
  };
}
export function projectedGroups(
  brands: Brand[],
  weeklyVolume: number,
  schedules = 2,
  p?: CostParameters,
): CostGroup[] {
  if (
    !brands.length ||
    !Number.isInteger(weeklyVolume) ||
    weeklyVolume < 0 ||
    weeklyVolume > 10000 ||
    !Number.isInteger(schedules) ||
    schedules < 1 ||
    schedules > 7
  )
    throw Error(
      "Volume harus bilangan bulat 0–10.000 dan jadwal 1–7 dengan merek aktif.",
    );
  if (
    brands.some(
      (b) =>
        !Number.isFinite(b.weeklyMean) ||
        b.weeklyMean <= 0 ||
        b.weight <= 0 ||
        b.volume <= 0,
    )
  )
    throw Error("Parameter merek tidak valid.");
  const mean = brands.reduce((s, b) => s + b.weeklyMean, 0);
  const raw = brands.map((b) => (weeklyVolume * b.weeklyMean) / mean),
    counts = raw.map(Math.floor);
  const order = raw
    .map((x, i) => ({ i, f: x - counts[i] }))
    .sort((a, b) => b.f - a.f);
  const remaining = weeklyVolume - counts.reduce((a, b) => a + b, 0);
  for (let k = 0; k < remaining; k++) counts[order[k].i]++;
  const groups = brands.map((b, i) => ({
    brandId: b.id,
    items: Array.from({ length: counts[i] }, (_, j) => ({
      id: `${b.id}-${j}`,
      authorizationId: "projection",
      category: b.category,
      weight: b.weight,
      volume: b.volume,
      value: b.value,
    })),
    batches: Math.min(schedules, counts[i]),
    waitingDays: (counts[i] * 3.5) / schedules,
  }));
  if (p)
    for (const g of groups) {
      const b = brands.find((b) => b.id === g.brandId)!;
      const capacity = Math.floor(
        Math.min(p.batchKg / b.weight, p.batchVolume / b.volume),
      );
      if (capacity < 1) throw Error("Barang melebihi kapasitas batch.");
      const perSlot = Math.floor(g.items.length / schedules),
        extra = g.items.length % schedules;
      g.batches = Array.from({ length: schedules }, (_, i) =>
        Math.ceil((perSlot + (i < extra ? 1 : 0)) / capacity),
      ).reduce((a, b) => a + b, 0);
    }
  return groups;
}
export function projection(
  brands: Brand[],
  p: CostParameters,
  volume: number,
  schedules = 2,
) {
  const groups = projectedGroups(brands, volume, schedules, p);
  return costModel(groups, p);
}
export function breakEvenDensity(
  brands: Brand[],
  p: CostParameters,
  max = 1000,
  schedules = 2,
) {
  for (let n = brands.length; n <= max; n++) {
    const c = projection(brands, p, n, schedules);
    if (
      c.byBrand.every(
        (b) =>
          b.count > 0 &&
          b.perReturn! < brands.find((x) => x.id === b.brandId)!.currentCost,
      )
    )
      return n;
  }
  return null;
}
export function compareModes(
  groups: CostGroup[],
  brands: Brand[],
  p: CostParameters,
  weeks = 1,
  networkDays: number | null = 4,
  networkWeeks = weeks,
) {
  const c = costModel(groups, p, networkWeeks),
    items = groups.flatMap((g) => g.items),
    n = items.length;
  const labor = items.reduce(
    (s, i) => s + p.inspectionMinutes[i.category] * p.wagePerMinute,
    0,
  );
  const values = items.reduce((s, i) => s + i.value, 0);
  const baseline = n
    ? groups.reduce(
        (s, g) =>
          s +
          g.items.length * brands.find((b) => b.id === g.brandId)!.currentCost,
        0,
      ) / n
    : null;
  return {
    baseline,
    modes: [
      {
        name: "Kurir individual",
        cost: n
          ? (n * (p.individualFreight + p.individualPackaging) +
              labor +
              values * p.individualDamageProbability) /
            n
          : null,
        days: p.individualDays,
        resellable: p.baselineResellable * (1 - p.individualDamageProbability),
      },
      {
        name: "Titik milik merek",
        cost: n
          ? (brands.length * p.storeFixedWeekly * weeks +
              n * p.storeTravelPerItem +
              labor +
              values * p.storeDamageProbability) /
            n
          : null,
        days: p.storeDays,
        resellable: p.baselineResellable * (1 - p.storeDamageProbability),
      },
      {
        name: "BALIKIN",
        cost: c.perReturn,
        days: networkDays,
        resellable:
          p.baselineResellable * (1 - p.damageProbability - p.lossProbability),
      },
    ],
  };
}

/** Check observed/projected costs at this volume; a first crossing is not monotonic. */
export function economicAssessment(
  costs: ReturnType<typeof costModel>,
  brands: Brand[],
) {
  const byBrand = costs.byBrand.map((c) => {
    const brand = brands.find((b) => b.id === c.brandId)!;
    return {
      brandId: c.brandId,
      name: brand.name,
      baseline: brand.currentCost,
      cost: c.perReturn,
      saving: c.perReturn === null ? null : brand.currentCost - c.perReturn,
      viable: c.perReturn !== null && c.perReturn < brand.currentCost,
    };
  });
  return {
    allViable:
      byBrand.length === brands.length && byBrand.every((b) => b.viable),
    byBrand,
  };
}
