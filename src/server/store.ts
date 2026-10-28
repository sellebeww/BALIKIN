import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyAction, type Action } from "../domain/operations";
import { networkSchema } from "../domain/persistence-schema";
import { seedNetwork } from "../domain/seed";
import type { Network } from "../domain/types";
class VersionConflictError extends Error {
  readonly code = "VERSION_CONFLICT";
  constructor() {
    super(
      "Data telah berubah di sesi lain. Data terbaru dimuat; tinjau lalu ulangi tindakan Anda.",
    );
  }
}
// Fail closed on damaged storage: never silently replace existing data with a seed.
export function createStore(directory: string) {
  const file = path.join(directory, "network.json");
  let queue: Promise<unknown> = Promise.resolve();
  async function save(n: Network) {
    await mkdir(directory, { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(n, null, 2));
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }
  async function read(): Promise<Network> {
    try {
      const n = JSON.parse(await readFile(file, "utf8"));
      networkSchema.parse(n);
      return n as Network;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        throw Error(
          "Penyimpanan lokal rusak atau tidak valid. Pulihkan berkas data dari cadangan; data tidak direset otomatis.",
          { cause: e },
        );
      const n = seedNetwork();
      await save(n);
      return n;
    }
  }
  return {
    transact(action?: Action, version?: number): Promise<Network> {
      const job = queue.then(async () => {
        const current = await read();
        if (!action) return current;
        if (version !== current.version) throw new VersionConflictError();
        const next = applyAction(current, action);
        await save(next);
        return next;
      });
      queue = job.catch(() => {});
      return job;
    },
  };
}
// Keep the mutation queue across development hot reloads in the same Node process.
const registry = globalThis as typeof globalThis & {
  returrukunStores?: Map<string, ReturnType<typeof createStore>>;
};
// shortcut: Vercel's filesystem is read-only except /tmp, which is per-instance and ephemeral; use a real database for durable data.
const directory = path.resolve(
  process.env.RETURRUKUN_DATA_DIR ??
    (process.env.VERCEL ? "/tmp/balikin" : path.join(process.cwd(), "data")),
);
registry.returrukunStores ??= new Map();
if (!registry.returrukunStores.has(directory))
  registry.returrukunStores.set(directory, createStore(directory));
export const transact = registry.returrukunStores.get(directory)!.transact;
