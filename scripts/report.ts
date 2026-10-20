import { brands } from "../src/domain/seed";
import { assumptions } from "../src/config/assumptions";
import { projection, breakEvenDensity } from "../src/domain/cost";
import { simulate, monteCarlo } from "../src/domain/simulator";
const o = { seed: 42, weeks: 4, multiplier: 1, schedules: 2, promo: false };
const s = simulate(brands, assumptions, o);
console.log(
  JSON.stringify(
    {
      density: breakEvenDensity(brands, assumptions),
      projection42: projection(brands, assumptions, 42),
      simulation: {
        cost: s.costs.perReturn,
        weekly: s.weeklyVolume,
        days: s.averageDays,
        p90: s.p90Days,
        queue: s.maxQueue,
      },
      range: monteCarlo(brands, assumptions, o),
      low: simulate(brands, assumptions, { ...o, multiplier: 0.15 }).costs
        .perReturn,
      promo: ((s) => ({
        days: s.averageDays,
        p90: s.p90Days,
        queue: s.maxQueue,
      }))(simulate(brands, assumptions, { ...o, promo: true })),
    },
    null,
    2,
  ),
);
