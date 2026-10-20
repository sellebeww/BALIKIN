import { expect, test, type Page } from "@playwright/test";
import type { Network } from "../../src/domain/types";
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
async function mutation(
  page: Page,
  perform: () => Promise<void>,
): Promise<Network> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/network") && r.request().method() === "POST",
    ),
    perform(),
  ]);
  expect(response.status(), await response.text()).toBe(200);
  await expect(page.locator(".content")).not.toHaveAttribute("inert", "");
  return response.json();
}
test("semua layar, query invalid, dan navigasi browser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?page=1.5");
  await expect(
    page.getByRole("heading", { name: "Gambaran jaringan" }),
  ).toBeVisible();
  for (const [name, title] of [
    ["Portal merek", "Ruang kerja merek"],
    ["Portal pembeli", "Retur tanpa repot"],
    ["Titik penerimaan", "Meja penerimaan"],
    ["Perencana batch", "Satu perjalanan, banyak retur."],
    ["Simulator biaya", "Kepadatan menentukan segalanya."],
    ["Evaluasi model", "Apakah bersama lebih hemat?"],
  ]) {
    await navigate(page, name);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Kepadatan menentukan segalanya." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("alur UI penuh dari pembeli hingga selesai dan persistensi reload", async ({
  page,
}) => {
  await page.goto("/?page=2");
  await expect(
    page.getByRole("button", { name: "Buat pesanan demo" }),
  ).toBeVisible();
  await mutation(page, () =>
    page.getByRole("button", { name: "Buat pesanan demo" }).click(),
  );
  let n = await mutation(page, () =>
    page.getByRole("button", { name: "Ajukan ke merek" }).click(),
  );
  const id = n.returns.at(-1)!.id;
  await navigate(page, "Portal merek");
  await page.getByLabel("Cari retur").fill(id);
  n = await mutation(page, () =>
    page.getByRole("button", { name: "Setujui", exact: true }).click(),
  );
  const r = n.returns.find((r) => r.id === id)!;
  await navigate(page, "Titik penerimaan");
  await page.getByLabel("Pilih QR demo").selectOption(id);
  await mutation(page, () =>
    page.getByRole("button", { name: "Terima barang", exact: true }).click(),
  );
  await page.getByLabel("Cari retur").fill(id);
  await page.getByRole("button", { name: "Periksa", exact: true }).click();
  await mutation(page, () =>
    page.getByRole("button", { name: "Simpan pemeriksaan" }).click(),
  );
  await mutation(page, () =>
    page.getByRole("button", { name: "Masuk antrean batch" }).click(),
  );
  await navigate(page, "Perencana batch");
  await mutation(page, () =>
    page.getByRole("button", { name: "Susun batch berikutnya" }).click(),
  );
  await mutation(page, () =>
    page.getByRole("button", { name: "Kirim batch (simulasi)" }).click(),
  );
  await mutation(page, () =>
    page.getByRole("button", { name: "Terima di merek (simulasi)" }).click(),
  );
  await navigate(page, "Portal merek");
  await page.getByLabel("Cari retur").fill(id);
  n = await mutation(page, () =>
    page.getByRole("button", { name: "Selesaikan (simulasi refund)" }).click(),
  );
  expect(n.returns.find((r) => r.id === id)?.status).toBe("selesai");
  await page.reload();
  await page.getByLabel("Cari retur").fill(id);
  await expect(
    page.getByRole("cell", { name: "selesai", exact: true }),
  ).toBeVisible();
  await navigate(page, "Titik penerimaan");
  await page.getByLabel("Kode QR", { exact: true }).fill(r.qr);
  await page.getByLabel("ID barang yang diserahkan").fill(r.item.id);
  await page
    .getByRole("button", { name: "Terima barang", exact: true })
    .click();
  await expect(page.locator(".notice[role=alert]")).toContainText("terpakai");
});
test("barang berbeda ditahan, tidak bisa diperiksa, dan keputusan sengketa tersimpan", async ({
  page,
  request,
}) => {
  const n: Network = await (await request.get("/api/network")).json(),
    r = n.returns.find((r) => r.status === "qr_terbit" && r.brandId === "b1")!;
  await page.goto("/?page=3");
  await page.getByLabel("Pilih QR demo").selectOption(r.id);
  await page.getByLabel("ID barang yang diserahkan").fill("BARANG-SALAH");
  await mutation(page, () =>
    page.getByRole("button", { name: "Terima barang", exact: true }).click(),
  );
  await page.getByLabel("Cari retur").fill(r.id);
  await mutation(page, () =>
    page.getByRole("button", { name: "Tahan", exact: true }).click(),
  );
  await expect(
    page.getByRole("button", { name: "Periksa", exact: true }),
  ).toHaveCount(0);
  await mutation(page, () =>
    page.getByRole("button", { name: "Eskalasi ke merek" }).click(),
  );
  await navigate(page, "Portal merek");
  await page.getByLabel("Cari retur").fill(r.id);
  await page.getByRole("button", { name: "Detail", exact: true }).click();
  await page
    .getByLabel("Catatan penyelesaian")
    .fill("Barang salah; pengajuan ditolak sesuai kesepakatan.");
  const result = await mutation(page, () =>
    page.getByRole("button", { name: "Simpan penyelesaian sengketa" }).click(),
  );
  expect(result.returns.find((x) => x.id === r.id)?.settlement?.status).toBe(
    "ditolak",
  );
});
test("S1–S7, ekspor CSV, Monte Carlo worker dan pembatalan", async ({
  page,
}) => {
  await page.goto("/?page=5");
  await expect(
    page.getByRole("button", { name: "Jalankan simulasi" }),
  ).toBeVisible();
  for (const id of ["S2", "S3", "S4", "S5", "S6", "S7", "S1"]) {
    await page
      .locator(".scenario")
      .filter({ has: page.locator("span", { hasText: id }) })
      .click();
    await expect(
      page.locator(".panel-heading").filter({ hasText: `${id} ·` }),
    ).toBeVisible();
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh hasil CSV" }).click();
  expect((await download).suggestedFilename()).toContain("S1");
  await page.getByRole("button", { name: "Jalankan Monte Carlo" }).click();
  await expect(page.locator(".mc-result")).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Jalankan Monte Carlo" }).click();
  await page.getByRole("button", { name: "Batalkan perhitungan" }).click();
  await expect(
    page.getByRole("button", { name: "Jalankan Monte Carlo" }),
  ).toBeEnabled();
  await page
    .locator(".scenario")
    .filter({ has: page.locator("span", { hasText: "S2" }) })
    .click();
  await expect(page.locator(".mc-result")).toHaveCount(0);
});
test("evaluasi menerima volume pecahan tanpa crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?page=6");
  await page
    .getByRole("spinbutton", { name: "Retur / minggu", exact: true })
    .fill("55.5");
  await expect(page.locator(".comparison-card")).toHaveCount(3);
  expect(errors).toEqual([]);
});
test("tampilan ponsel tidak meluber dan menu dapat ditutup", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Gambaran jaringan" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/private/tmp/balikin-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Portal pembeli", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Retur tanpa repot" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buka navigasi" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("API memvalidasi payload, origin, ukuran, dan konflik versi", async ({
  request,
}) => {
  const n = await (await request.get("/api/network")).json();
  const body = {
    version: n.version,
    action: { type: "parameters", parameters: n.parameters },
  };
  expect((await request.post("/api/network", { data: body })).status()).toBe(
    200,
  );
  expect((await request.post("/api/network", { data: body })).status()).toBe(
    409,
  );
  expect(
    (
      await request.post("/api/network", {
        data: { version: -1, action: { type: "expire" } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/network", {
        headers: { origin: "https://wrong.invalid" },
        data: body,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/network", {
        headers: { "content-type": "application/json" },
        data: "x".repeat(66000),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await request.post("/api/network", {
        headers: { "content-type": "text/plain" },
        data: "hello",
      })
    ).status(),
  ).toBe(415);
});
test("profil perusahaan dan aplikasi saling terhubung", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Lihat profil perusahaan" }).click();
  await expect(page).toHaveURL(/\/profil$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Balikin",
  );
  await page.getByRole("link", { name: "Masuk ke aplikasi" }).click();
  await expect(
    page.getByRole("heading", { name: "Gambaran jaringan" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Profil BALIKIN" }).click();
  await expect(page).toHaveURL(/\/profil$/);
  expect(errors).toEqual([]);
});
