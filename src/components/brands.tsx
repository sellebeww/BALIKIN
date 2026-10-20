"use client";
import { useState } from "react";
import { Badge, date, label, ReturnTable, type Props } from "./shared";
export function Brands({ n, act }: Props) {
  const [brand, setBrand] = useState(n.brands[0].id),
    [selected, setSelected] = useState(""),
    [reason, setReason] = useState(
      "Kondisi saat diterima berbeda dari foto pemeriksaan",
    ),
    [photo, setPhoto] = useState("kondisi-di-merek.jpg");
  const b = n.brands.find((b) => b.id === brand)!,
    r = n.returns.find((r) => r.id === selected);
  return (
    <>
      <div className="toolbar">
        <label>
          Merek
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setSelected("");
            }}
          >
            {n.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <span className="badge">Pergantian peran demo · tanpa autentikasi</span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Kebijakan retur · {b.name}</h2>
            <p>
              {b.address} · kategori {b.policy.categories.join(", ")}
            </p>
          </div>
        </div>
        <form
          key={brand + b.policy.days + b.policy.condition}
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act({
              type: "policy",
              id: brand,
              days: Number(f.get("days")),
              condition: f.get("condition"),
              currentCost: Number(f.get("currentCost")),
            });
          }}
        >
          <label>
            Batas hari
            <input
              type="number"
              min="1"
              max="90"
              name="days"
              defaultValue={b.policy.days}
              required
            />
          </label>
          <label className="grow">
            Kondisi wajib
            <input
              name="condition"
              defaultValue={b.policy.condition}
              required
            />
          </label>
          <label>
            Biaya saat ini / retur (Rp)
            <input
              name="currentCost"
              type="number"
              min="0"
              max="1000000"
              required
              defaultValue={b.currentCost}
            />
          </label>
          <button className="button" type="submit">
            Simpan kebijakan
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Antrean dan keputusan</h2>
            <p>
              Setujui pengajuan, tinjau bukti, atau ajukan gugatan dalam{" "}
              {n.parameters.disputeDays} hari setelah penerimaan.
            </p>
          </div>
        </div>
        <ReturnTable
          key={brand}
          n={n}
          records={n.returns
            .filter((r) => r.brandId === brand)
            .sort(
              (a, b) =>
                Number(a.status === "selesai") - Number(b.status === "selesai"),
            )}
        >
          {(r) => (
            <>
              {r.status === "diajukan" && (
                <>
                  <button
                    className="button small primary"
                    onClick={() => act({ type: "approve", id: r.id })}
                  >
                    Setujui
                  </button>
                  <button
                    className="button small"
                    onClick={() => act({ type: "reject", id: r.id })}
                  >
                    Tolak
                  </button>
                </>
              )}
              <button
                className="button small"
                onClick={() => setSelected(r.id)}
              >
                Detail
              </button>
              {r.status === "diterima_merek" && (
                <button
                  className="button small"
                  onClick={() => act({ type: "finish", id: r.id })}
                >
                  Selesaikan (simulasi refund)
                </button>
              )}
            </>
          )}
        </ReturnTable>
      </section>
      {r && (
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Detail {r.id}</h2>
            <button className="button small" onClick={() => setSelected("")}>
              Tutup
            </button>
          </div>
          <p>Alasan: {r.reason}</p>
          <p>
            Keputusan:{" "}
            {r.inspection ? label(r.inspection.decision) : "Belum diperiksa"}
          </p>
          <div className="photo-list">
            {r.inspection?.photos.map((f) => (
              <span key={f}>
                ▧ {f}
                <small>Foto simulasi · nama berkas</small>
              </span>
            ))}
          </div>
          {r.receivedByBrandAt && (
            <p>
              Diterima merek: {date(r.receivedByBrandAt)} · batas gugatan{" "}
              {date(
                new Date(
                  Date.parse(r.receivedByBrandAt) +
                    n.parameters.disputeDays * 86400000,
                ).toISOString(),
              )}
            </p>
          )}
          <ol className="timeline">
            {r.history.map((h, i) => (
              <li key={i}>
                <Badge value={h.status} />
                <small>
                  {date(h.at)} {h.note}
                </small>
              </li>
            ))}
          </ol>
          {r.receivedByBrandAt &&
            ["diterima_merek", "selesai"].includes(r.status) && (
              <div className="inline-form">
                <label className="grow">
                  Alasan gugatan
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <label>
                  Foto bukti merek (simulasi)
                  <input
                    value={photo}
                    onChange={(e) => setPhoto(e.target.value)}
                  />
                </label>
                <button
                  className="button"
                  onClick={() =>
                    act({
                      type: "dispute",
                      id: r.id,
                      reason,
                      photos: photo.trim() ? [photo] : [],
                    })
                  }
                >
                  Gugat keputusan
                </button>
              </div>
            )}
          {r.dispute && (
            <p>
              Gugatan: {r.dispute.reason} · bukti merek:{" "}
              {r.dispute.brandPhotos.join(", ")}
            </p>
          )}
          {["ditahan", "tidak_sesuai"].includes(r.status) && (
            <button
              className="button"
              onClick={() =>
                act({
                  type: "escalate",
                  id: r.id,
                  reason: "Merek meninjau ketidaksesuaian barang",
                })
              }
            >
              Tinjau sebagai sengketa
            </button>
          )}
          {r.status === "sengketa" && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void act({
                  type: "resolve",
                  id: r.id,
                  outcome: f.get("outcome"),
                  reason: f.get("resolution"),
                });
              }}
            >
              <label>
                Keputusan merek
                <select name="outcome">
                  <option value="ditolak">Retur ditolak</option>
                  <option value="refund_diproses">
                    Refund disepakati (simulasi)
                  </option>
                </select>
              </label>
              <label className="grow">
                Catatan penyelesaian
                <input
                  name="resolution"
                  required
                  placeholder="Alasan keputusan dan tindak lanjut barang"
                />
              </label>
              <button className="button primary" type="submit">
                Simpan penyelesaian sengketa
              </button>
            </form>
          )}
          {r.settlement?.resolution && (
            <p>
              Penyelesaian: {label(r.settlement.status)} —{" "}
              {r.settlement.resolution}
            </p>
          )}
        </section>
      )}
      <section className="panel">
        <h2>Pemberitahuan jaringan</h2>
        {n.notices.slice(0, 8).map((s, i) => (
          <p key={i} className="notification">
            {s}
          </p>
        ))}
      </section>
    </>
  );
}
