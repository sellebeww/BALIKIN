"use client";
import {
  breakEvenDensity,
  economicAssessment,
  projection,
} from "@/domain/cost";
import { percentile } from "@/domain/simulator";
import type { Decision, Network } from "@/domain/types";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Clock,
  MapPin,
} from "lucide-react";
import { LineChart } from "./charts";
import { label, Metric, money, num } from "./shared";
export function Dashboard({
  n,
  navigate,
}: {
  n: Network;
  navigate: (i: number) => void;
}) {
  const volume = n.brands.reduce((s, b) => s + b.weeklyMean, 0),
    cost = projection(n.brands, n.parameters, Math.round(volume)),
    density = breakEvenDensity(n.brands, n.parameters);
  const active = n.returns.filter(
      (r) => !["selesai", "ditolak_merek", "qr_kedaluwarsa"].includes(r.status),
    ),
    completed = n.returns.filter(
      (r) => r.settlement?.completedAt && r.approvedAt,
    ),
    days = completed.map(
      (r) =>
        (Date.parse(r.settlement!.completedAt!) - Date.parse(r.approvedAt!)) /
        86400000,
    );
  const inspected = n.returns.filter((r) => r.inspection),
    rates = (v: Decision) =>
      inspected.length
        ? (100 * inspected.filter((r) => r.inspection!.decision === v).length) /
          inspected.length
        : 0;
  const viable = economicAssessment(cost, n.brands).allViable;
  const points = [10, 20, 30, 42, 55, 70, 90, 120].map((x) => ({
    x,
    values: [
      projection(n.brands, n.parameters, x).perReturn ?? 0,
      n.brands.reduce((s, b) => s + b.currentCost * b.weeklyMean, 0) / volume,
    ],
  }));
  return (
    <>
      <div className="section-top">
        <span className="live-label">
          <i />
          Ringkasan jaringan
        </span>
        <button className="button primary" onClick={() => navigate(5)}>
          Buka simulator <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="metrics">
        <Metric
          title="Kepadatan asumsi"
          value={`${volume} retur`}
          detail="per minggu · 5 merek aktif"
        />
        <Metric
          title="Biaya per retur"
          value={money(cost.perReturn)}
          detail="Proyeksi biaya penuh · bukan tagihan"
        />
        <Metric
          title="Titik impas semua merek"
          value={density ? `${density} / minggu` : "Belum tercapai"}
          detail={
            density
              ? `${Math.max(0, density - volume)} retur lagi dari asumsi saat ini`
              : "Tidak ditemukan hingga 1.000 retur"
          }
          tone="mint"
        />
        <Metric
          title="Retur dalam proses"
          value={String(active.length)}
          detail={`${n.returns.length} total retur demo`}
        />
      </div>
      <div className="warning-strip">
        <AlertTriangle size={21} />
        <div>
          <strong>
            {viable
              ? "Ambang biaya proyeksi tercapai"
              : "Kepadatan saat ini di bawah titik impas"}
          </strong>
          <p>
            Rata-rata murah belum berarti semua merek untung. Uji biaya tiap
            merek dan kapasitas sebelum memperluas jaringan.
          </p>
        </div>
        <button onClick={() => navigate(6)}>
          Lihat evaluasi <ArrowRight size={16} />
        </button>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Semakin padat, semakin efisien?</h2>
              <p>Biaya per retur terhadap volume mingguan</p>
            </div>
            <span className="badge">Proyeksi</span>
          </div>
          <LineChart
            points={points}
            series={["BALIKIN", "Biaya merek saat ini (rata-rata)"]}
            format={(v) => `${Math.round(v / 1000)} rb`}
            label="Biaya retur terhadap kepadatan mingguan"
          />
          <div className="chart-foot">
            RETUR / MINGGU <span>Biaya tetap dibagi lebih banyak retur.</span>
          </div>
        </section>
        <section className="panel network-card">
          <div className="panel-heading">
            <div>
              <h2>Satu titik, lima merek.</h2>
              <p>Jaringan Bandung Utara</p>
            </div>
            <MapPin size={20} />
          </div>
          <div
            className="network-art"
            aria-label="Lima merek terhubung ke satu titik penerimaan"
          >
            <div className="orbit" />
            <div className="hub">
              <Boxes size={29} />
              <small>TITIK BERSAMA</small>
            </div>
            {n.brands.map((b, i) => (
              <span key={b.id} className={`node node-${i}`} title={b.name}>
                {["RK", "SH", "US", "LL", "TA"][i]}
              </span>
            ))}
          </div>
          <div className="schedule-row">
            <Clock size={17} />
            <span>
              Selasa & Jumat<strong>16.00 WIB · cut-off 12.00</strong>
            </span>
          </div>
          <button className="text-link" onClick={() => navigate(4)}>
            Lihat perencana batch <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Kesehatan ekonomi tiap merek</h2>
            <p>
              Alokasi biaya tetap proporsional jumlah retur. Asumsi {volume}{" "}
              retur/minggu.
            </p>
          </div>
          <button className="text-link" onClick={() => navigate(1)}>
            Portal merek <ArrowUpRight size={15} />
          </button>
        </div>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Tabel data, dapat digeser"
        >
          <table>
            <thead>
              <tr>
                <th>Merek lokal</th>
                <th>Retur / minggu</th>
                <th>Biaya sekarang</th>
                <th>Biaya bersama</th>
                <th>Selisih biaya</th>
                <th>Hasil</th>
              </tr>
            </thead>
            <tbody>
              {cost.byBrand.map((c, i) => {
                const b = n.brands.find((b) => b.id === c.brandId)!,
                  saving =
                    c.perReturn === null ? null : b.currentCost - c.perReturn;
                return (
                  <tr key={b.id}>
                    <td>
                      <div className="brand-cell">
                        <span className={`brand-avatar color-${i}`}>
                          {b.name
                            .split(" ")
                            .map((s) => s[0])
                            .join("")}
                        </span>
                        <span>
                          <b>{b.name}</b>
                          <small>{label(b.category)}</small>
                        </span>
                      </div>
                    </td>
                    <td>{c.count}</td>
                    <td>{money(b.currentCost)}</td>
                    <td>
                      <b>{money(c.perReturn)}</b>
                    </td>
                    <td
                      className={
                        saving !== null && saving > 0 ? "positive" : "negative"
                      }
                    >
                      {saving !== null && saving > 0 ? "−" : "+"}
                      {money(saving === null ? null : Math.abs(saving))}
                    </td>
                    <td>
                      <span
                        className={`badge ${saving !== null && saving > 0 ? "good" : "bad"}`}
                      >
                        {saving !== null && saving > 0
                          ? "Lebih hemat"
                          : "Belum hemat"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="metrics secondary">
        <Metric
          title="Penyelesaian historis"
          value={`${num(days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0)} hari`}
          detail={`P90 ${num(percentile(days, 0.9))} hari · data demo`}
        />
        <Metric
          title="Layak jual kembali"
          value={`${num(rates("layak_jual"))}%`}
          detail={`${num(rates("perlu_perbaikan"))}% perbaikan · ${num(rates("rusak"))}% rusak`}
        />
        <Metric
          title="Sengketa / tidak sesuai"
          value={`${num((n.returns.filter((r) => r.status === "sengketa").length / n.returns.length) * 100)}% / ${num((n.returns.filter((r) => r.receipt?.match === "berbeda").length / n.returns.length) * 100)}%`}
          detail="Dari seluruh otorisasi demo"
        />
        <Metric
          title="Kerugian aktual tercatat"
          value={money(n.returns.reduce((s, r) => s + (r.actualLoss ?? 0), 0))}
          detail="Kerusakan / kehilangan konsolidasi"
        />
      </div>
    </>
  );
}
