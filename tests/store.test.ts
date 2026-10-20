import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createStore } from "../src/server/store";
it("mutasi bersamaan memiliki satu pemenang dan tersimpan secara atomik", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "returrukun-store-"));
  try {
    const store = createStore(dir),
      n = await store.transact();
    const results = await Promise.allSettled([
      store.transact(
        { type: "demoOrder", id: "b1", initials: "AA" },
        n.version,
      ),
      store.transact(
        { type: "demoOrder", id: "b2", initials: "BB" },
        n.version,
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const next = await createStore(dir).transact();
    expect(next.version).toBe(n.version + 1);
    expect(next.orders).toHaveLength(n.orders.length + 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("JSON rusak tidak diam-diam direset", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "returrukun-store-"));
  try {
    const file = path.join(dir, "network.json");
    await writeFile(file, "{broken");
    await expect(createStore(dir).transact()).rejects.toThrow("tidak direset");
    expect(await readFile(file, "utf8")).toBe("{broken");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
