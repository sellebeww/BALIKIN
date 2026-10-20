"use client";
import {
  breakEvenDensity,
  compareModes,
  economicAssessment,
  projectedGroups,
  projection,
} from "@/domain/cost";
import type { Network } from "@/domain/types";
import { Scale } from "lucide-react";
import { useState } from "react";
import { LineChart } from "./charts";
import { Metric, money, num } from "./shared";
export function Evaluation({ n }: { n: Network }) {
  const [volume, setVolume] = useState(42),
    [limit, setLimit] = useState(200);
  const natural = n.brands.reduce((s, b) => s + b.weeklyMean, 0),
    threshold = breakEvenDensity(n.brands, n.parameters);
  const groups = projectedGroups(n.brands, volume, 2, n.parameters),
    project = projection(n.brands, n.parameters, volume);
  const comparison = compareModes(groups, n.brands, n.parameters),
    capacity =
      (n.parameters.operatorMinutesPerDay * 7) /
      (n.brands.reduce(
        (s, b) =>
          s +
          b.weeklyMean *
            (n.parameters.receivingMinutes +
              n.parameters.inspectionMinutes[b.category]),
        0,
      ) /
        natural);
  const samples = Array.from(
    { length: Math.floor(limit / 5) },
    (_, i) => (i + 1) * 5,
  ).map((x) => {
    const gs = projectedGroups(n.brands, x);
    const projected = projection(n.brands, n.parameters, x);
    const c = compareModes(gs, n.brands, n.parameters);
    return {
      x,
      values: [
        projected.perReturn ?? 0,
        c.modes[0].cost ?? 0,
        c.modes[1].cost ?? 0,
      ],
    };
  });
  const crossing = (mode: 0 | 1) => {
    for (let x = 5; x <= 1000; x++) {
      const c = compareModes(
        projectedGroups(n.brands, x),
        n.brands,
        n.parameters,
      );
      if (
        projection(n.brands, n.parameters, x).perReturn! < c.modes[mode].cost!
      )
        return x;
    }
    return null;
  };
  const modes = comparison.modes.map((m, i) =>
      i === 2 ? { ...m, cost: project.perReturn } : m,
    ),
    networkCost = modes[2].cost!;
  return (
    <>
      <div className="warning-strip neutral">
        <Scale />
        <div>
          <strong>Set barang sama. Tiga cara mengembalikan.</strong>
          <p>
            Nilai, kategori, berat, dan jumlah barang identik untuk semua mode.
            Biaya perjalanan ke toko termasuk; waktu perjalanan pembeli belum
            dimonetisasi.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="inline-form">
          <label className="grow">
            Volume mingguan: <b>{volume} retur</b>
            <input
              type="range"
              min="5"
              max="1000"
              value={volume}
              onChange={(e) => setVolume(Math.round(Number(e.target.value)))}
            />
          </label>
          <label>
            Retur / minggu
            <input
              type="number"
              min="5"
              max="1000"
              value={volume}
              onChange={(e) =>
                setVolume(
                  Math.min(
                    1000,
                    Math.max(5, Math.round(Number(e.target.value)) || 5),
                  ),
                )
              }
            />
          </label>
        </div>
        <div className="comparison-grid">
          {modes.map((m, i) => (
            <article
              className={
                i === 2 ? "comparison-card featured" : "comparison-card"
              }
              key={m.name}
            >
              <span className="eyebrow">MODE 0{i + 1}</span>
              <h2>{m.name}</h2>
              <strong>{money(m.cost)}</strong>
              <p>per retur · biaya penuh</p>
              <hr />
              <dl>
                <dt>Penyelesaian asumsi</dt>
                <dd>{m.days} hari</dd>
                <dt>Kembali layak jual</dt>
                <dd>{num(m.resellable * 100)}%</dd>
              </dl>
              {i === 2 ? (
                <span
                  className={`badge ${m.cost! < Math.min(modes[0].cost!, modes[1].cost!) ? "good" : "bad"}`}
                >
                  {m.cost! < Math.min(modes[0].cost!, modes[1].cost!)
                    ? "Lebih hemat dari kedua mode"
                    : "Belum menang di kedua mode"}
                </span>
              ) : (
                <p className={networkCost < m.cost! ? "positive" : "negative"}>
                  BALIKIN{" "}
                  {networkCost < m.cost! ? "lebih murah" : "lebih mahal"}{" "}
                  {money(Math.abs(m.cost! - networkCost))}
                </p>
              )}
            </article>
          ))}
        </div>
        <p className="caption">
          Waktu di kartu adalah asumsi pembanding. Durasi BALIKIN yang
          memperhitungkan antrean tersedia pada simulator. Mutu dihitung dari
          proporsi awal yang sama dikurangi risiko tiap mode.
        </p>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Pada kepadatan mana model ini menang?</h2>
            <p>
              Seluruh kurva menggunakan komposisi barang yang sama pada setiap
              volume.
            </p>
          </div>
          <select
            aria-label="Batas grafik"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value="100">Hingga 100 retur</option>
            <option value="200">Hingga 200 retur</option>
          </select>
        </div>
        <LineChart
          points={samples}
          series={["BALIKIN", "Kurir individual", "Titik milik merek"]}
          format={(v) => `${Math.round(v / 1000)} rb`}
          label="Perbandingan biaya tiga mode pada berbagai volume"
        />
        <div className="metrics secondary">
          <Metric
            title="Mulai mengungguli kurir"
            value={`${crossing(0) ?? "Tidak ada"} retur`}
            detail="Ambang pertama dalam pencarian 5–1.000"
          />
          <Metric
            title="Mulai mengungguli titik merek"
            value={`${crossing(1) ?? "Tidak ada"} retur`}
            detail="Dengan alokasi biaya tetap titik merek"
          />
          <Metric
            title="Batas kapasitas rata-rata"
            value={`${Math.floor(capacity)} / minggu`}
            detail="Di atas ini antrean tumbuh; proyeksi optimistis"
          />
        </div>
      </section>
      <section className="panel conclusion">
        <span className="eyebrow">KEPUTUSAN VALIDASI</span>
        <h2>
          {economicAssessment(
            projection(n.brands, n.parameters, Math.round(natural)),
            n.brands,
          ).allViable
            ? "Ambang proyeksi tercapai; validasi lapangan tetap diperlukan."
            : `Belum layak diluncurkan pada asumsi ${num(natural)} retur per minggu.`}
        </h2>
        <p>
          Ambang agar semua merek lebih hemat dari biaya saat ini adalah{" "}
          <b>
            {breakEvenDensity(n.brands, n.parameters) ?? "belum ditemukan"}{" "}
            retur/minggu
          </b>
          . Ambang ini berbeda dari perbandingan tiga mode: biaya aktual merek
          dan biaya model pembanding bukan angka yang sama.
        </p>
        <p>
          Batch normal pun banyak yang kurang dari separuh kapasitas. Ini temuan
          model, bukan sesuatu yang perlu disembunyikan. Validasi jumlah retur
          nyata, kesediaan pembeli datang, durasi pemeriksaan, dan tarif angkut
          sebelum mengambil keputusan investasi.
        </p>
        <p className="caption">
          Ambang adalah perpotongan pertama, bukan jaminan semua volume
          berikutnya lebih murah: penambahan batch membuat biaya bertangga.
          Untuk volume di atas kapasitas, gunakan simulator antrean.
        </p>
      </section>
    </>
  );
}
