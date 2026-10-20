import assert from "node:assert/strict";
const base = process.env.RETURRUKUN_URL ?? "http://127.0.0.1:3100";
const page = await fetch(base);
assert.equal(page.status, 200);
assert.match(await page.text(), /BALIKIN/);
let response = await fetch(base + "/api/network");
assert.equal(response.status, 200);
const n = await response.json();
assert.equal(n.brands.length, 5);
assert.ok(n.returns.length >= 80);
const post = (body) =>
  fetch(base + "/api/network", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(body),
  });
response = await post({
  version: n.version,
  action: { type: "receive", qr: "NO-AUTHORIZATION", itemId: "NO-ITEM" },
});
assert.equal(response.status, 400);
assert.match((await response.json()).error, /Tanpa otorisasi/);
response = await post({
  version: n.version,
  action: { type: "parameters", parameters: n.parameters },
});
assert.equal(response.status, 200);
const updated = await response.json();
assert.equal(updated.version, n.version + 1);
response = await post({
  version: n.version,
  action: { type: "parameters", parameters: n.parameters },
});
assert.equal(response.status, 409);
assert.match((await response.json()).error, /Data telah berubah/);
response = await fetch(base + "/api/network");
assert.equal((await response.json()).version, updated.version);
response = await fetch(base + "/api/network", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://other.invalid",
  },
  body: JSON.stringify({
    version: updated.version,
    action: { type: "expire" },
  }),
});
assert.equal(response.status, 403);
console.log(
  "Smoke lulus: halaman HTTP 200, seed JSON, otorisasi ditolak, tulis/baca persisten, versi stale ditolak, origin asing ditolak.",
);
