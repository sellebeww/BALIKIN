import {
  realizedCost,
  simulate,
  summarizeMonteCarlo,
  type SimOptions,
} from "../domain/simulator";
import type { Brand, CostParameters } from "../domain/types";
self.onmessage = (
  event: MessageEvent<{
    brands: Brand[];
    parameters: CostParameters;
    options: SimOptions;
  }>,
) => {
  try {
    const { brands, parameters, options } = event.data,
      costs: number[] = [],
      runs = 200;
    for (let i = 0; i < runs; i++) {
      const cost = realizedCost(
        simulate(brands, parameters, {
          ...options,
          seed: options.seed + i * 7919,
        }),
      );
      if (cost !== null) costs.push(cost);
      if ((i + 1) % 5 === 0) self.postMessage({ progress: i + 1 });
    }
    self.postMessage({ result: summarizeMonteCarlo(costs, runs) });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
