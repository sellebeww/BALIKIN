"use client";
import { runningCost } from "@/domain/running-cost";
import { Clock } from "lucide-react";
import { Badge, date, Empty, Metric, money, num, type Props } from "./shared";
export function Batches({ n, act }: Props) {
  const running = runningCost(n, Date.now()),
    weeks = running.weeks;
  return (
    <>
      <div className="metrics secondary">
        <Metric
          title="Biaya berjalan demo operasi"
          value={money(running.total)}
          detail={`${weeks} minggu biaya tetap + batch terencana`}
        />
        <Metric
          title="Biaya / barang diterima"
          value={money(running.perReturn)}
          detail={`${running.received} barang · impor historis dikecualikan`}
        />
        <Metric
          title="Batch kurang separuh isi"
          value={String(
            n.batches.filter(
              (b) =>
                Math.max(
                  b.weight / (b.capacityKg ?? n.parameters.batchKg),
                  b.volume / (b.capacityVolume ?? n.parameters.batchVolume),
                ) < 0.5,
            ).length,
          )}
          detail={`${n.batches.length} total batch operasi`}
        />
      </div>
      <p className="caption">
        Estimasi komitmen: tarif angkut/kemasan batch dicatat saat pembentukan;
        komponen lain memakai asumsi terkini. Barang yang belum dibatch belum
        memiliki ongkos angkut.
      </p>
      <div className="warning-strip neutral">
        <Clock />
        <div>
          <strong>Selasa & Jumat · 16.00 WIB</strong>
          <p>
            Cut-off {n.parameters.cutoffHours} jam sebelum pengiriman. Tombol
            pengiriman memajukan waktu secara simulasi ke jadwal batch.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => act({ type: "plan" })}
        >
          Susun batch berikutnya
        </button>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Antrean konsolidasi</h2>
            <p>
              {n.returns.filter((r) => r.status === "menunggu_batch").length}{" "}
              barang menunggu batch · kapasitas {n.parameters.batchKg} kg /{" "}
              {n.parameters.batchVolume} liter
            </p>
          </div>
        </div>
        {!n.batches.length ? (
          <Empty>
            Belum ada batch. Terima dan periksa barang, masukkan antrean, lalu
            susun batch.
          </Empty>
        ) : (
          <div className="batch-grid">
            {n.batches.map((b) => (
              <article className="batch-card" key={b.id}>
                <div className="panel-heading">
                  <h3>{n.brands.find((x) => x.id === b.brandId)?.name}</h3>
                  <Badge value={b.status} />
                </div>
                <p>{date(b.scheduledAt)}</p>
                <small>Cut-off: {date(b.cutoffAt)}</small>
                <label>
                  Berat {num(b.weight)} / {b.capacityKg ?? n.parameters.batchKg}{" "}
                  kg
                  <progress
                    max={b.capacityKg ?? n.parameters.batchKg}
                    value={b.weight}
                  />
                </label>
                <label>
                  Volume {num(b.volume)} /{" "}
                  {b.capacityVolume ?? n.parameters.batchVolume} L
                  <progress
                    max={b.capacityVolume ?? n.parameters.batchVolume}
                    value={b.volume}
                  />
                </label>
                <p>
                  {b.itemIds.length} barang · angkut {money(b.freight)}
                </p>
                <small>
                  Rata-rata tunggu:{" "}
                  {num(
                    n.returns
                      .filter((r) => r.batchId === b.id)
                      .reduce((s, r) => s + (r.waitingDays ?? 0), 0) /
                      b.itemIds.length,
                  )}{" "}
                  hari
                </small>
                <div className="actions">
                  {b.status === "terencana" && (
                    <button
                      className="button primary"
                      onClick={() => act({ type: "ship", id: b.id })}
                    >
                      Kirim batch (simulasi)
                    </button>
                  )}
                  {b.status === "dikirim" && (
                    <button
                      className="button"
                      onClick={() => act({ type: "arrive", id: b.id })}
                    >
                      Terima di merek (simulasi)
                    </button>
                  )}
                </div>
                {b.status !== "diterima" &&
                  n.returns
                    .filter(
                      (r) =>
                        r.batchId === b.id &&
                        ["dikonsolidasi", "dikirim_balik"].includes(r.status),
                    )
                    .map((r) => (
                      <div className="incident-row" key={r.id}>
                        <small>{r.id}</small>
                        <button
                          onClick={() =>
                            act({
                              type: "incident",
                              id: r.id,
                              incident: "rusak",
                            })
                          }
                        >
                          Catat rusak
                        </button>
                        <button
                          onClick={() =>
                            act({
                              type: "incident",
                              id: r.id,
                              incident: "hilang",
                            })
                          }
                        >
                          Catat hilang
                        </button>
                      </div>
                    ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
