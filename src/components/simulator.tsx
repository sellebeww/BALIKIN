"use client";
import {
  breakEvenDensity,
  economicAssessment,
  projection,
} from "@/domain/cost";
import { csv } from "@/domain/export";
import { runScenario, scenarios } from "@/domain/scenarios";
import type { SimOptions } from "@/domain/simulator";
import type { CostParameters } from "@/domain/types";
import { AlertTriangle, ArrowUpRight, Check, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LineChart } from "./charts";
import { Metric, money, num, type Props } from "./shared";
import { useMonteCarlo } from "./use-monte-carlo";
const defaultOptions: SimOptions = {
  seed: 42,
  weeks: 4,
  multiplier: 1,
  schedules: 2,
  promo: false,
};
const parameterLabels: Record<string, string> = {
  wagePerMinute: "Upah / menit (Rp)",
  receivingMinutes: "Penerimaan / barang (menit)",
  weeklyRent: "Sewa titik / minggu (Rp)",
  weeklyEquipment: "Perlengkapan / minggu (Rp)",
  packagingPerBatch: "Kemasan / batch (Rp)",
  packagingPerItem: "Kemasan / barang (Rp)",
  freightFixed: "Angkut tetap / batch (Rp)",
  freightPerKg: "Angkut / kg (Rp)",
  damageProbability: "Probabilitas rusak (0–0,5)",
  lossProbability: "Probabilitas hilang (0–0,5)",
  storagePerDay: "Simpan / barang / hari (Rp)",
  platformPerItem: "Koordinasi / barang (Rp)",
  minPhotos: "Minimal foto berbeda",
  disputeDays: "Batas gugatan (hari)",
  cutoffHours: "Cut-off sebelum kirim (jam)",
  batchKg: "Kapasitas batch (kg)",
  batchVolume: "Kapasitas batch (liter)",
  operatorMinutesPerDay: "Kapasitas operator (menit/hari, min 120)",
  individualFreight: "Kurir individual / barang (Rp)",
  individualPackaging: "Kemasan individual (Rp)",
  individualDays: "Durasi kurir individual (hari)",
  storeFixedWeekly: "Biaya titik / merek / minggu (Rp)",
  storeTravelPerItem: "Perjalanan pembeli ke toko (Rp)",
  storeDays: "Durasi retur ke toko (hari)",
  individualDamageProbability: "Risiko rusak kurir individual (0–1)",
  storeDamageProbability: "Risiko rusak titik merek (0–1)",
  baselineResellable: "Proporsi layak jual awal (0–1)",
};
function Means({ n, act }: Props) {
  return (
    <details className="panel">
      <summary>Distribusi Poisson per merek · atur rerata mingguan</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void act({
            type: "means",
            means: Object.fromEntries(
              n.brands.map((b) => [b.id, Number(f.get(b.id))]),
            ),
          });
        }}
      >
        <div className="parameter-grid">
          {n.brands.map((b) => (
            <label key={b.id}>
              {b.name}
              <input
                name={b.id}
                type="number"
                required
                min="0.1"
                max="100"
                step="0.1"
                defaultValue={b.weeklyMean}
              />
            </label>
          ))}
        </div>
        <button className="button" type="submit">
          Simpan rerata
        </button>
      </form>
    </details>
  );
}
function Parameters({ n, act }: Props) {
  const [draft, setDraft] = useState<CostParameters>(n.parameters);
  useEffect(() => setDraft(n.parameters), [n.parameters]);
  return (
    <details className="panel parameters">
      <summary>
        Parameter biaya & operasi <span>ASUMSI — ganti dengan data nyata</span>
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act({ type: "parameters", parameters: draft });
        }}
      >
        <div className="parameter-grid">
          {Object.entries(draft)
            .filter(([key]) => key !== "inspectionMinutes")
            .map(([key, value]) => (
              <label key={key}>
                {parameterLabels[key] ?? key}
                <input
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={value as number}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          {Object.entries(draft.inspectionMinutes).map(([key, value]) => (
            <label key={key}>
              Pemeriksaan {key} (menit)
              <input
                required
                type="number"
                min="1"
                max="60"
                value={value}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    inspectionMinutes: {
                      ...draft.inspectionMinutes,
                      [key]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        <button className="button primary" type="submit">
          Simpan parameter & hitung ulang
        </button>
      </form>
    </details>
  );
}
function downloadReport(
  rows: (string | number | null | undefined)[][],
  filename: string,
) {
  const url = URL.createObjectURL(
    new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Simulator({ n, act }: Props) {
  const [scenario, setScenario] = useState("S1"),
    [options, setOptions] = useState(defaultOptions),
    [draft, setDraft] = useState(defaultOptions),
    [axis, setAxis] = useState("volume");
  const run = useMemo(
      () => runScenario(scenario, n.brands, n.parameters, options),
      [scenario, n, options],
    ),
    s = run.result;
  const density = useMemo(
    () =>
      breakEvenDensity(
        n.brands.filter((b) => b.id !== run.options.leaveBrand),
        n.parameters,
        1000,
        options.schedules,
      ),
    [n, options.schedules, run.options.leaveBrand],
  );
  const mcTask = useMonteCarlo(n.brands, n.parameters, run.options),
    mc = mcTask.result,
    calculating = mcTask.busy;
  const activeBrands = n.brands.filter((b) => b.id !== run.options.leaveBrand),
    assessment = economicAssessment(s.costs, activeBrands);
  const natural = Math.round(
    activeBrands.reduce((sum, b) => sum + b.weeklyMean, 0),
  );
  const before = useMemo(
    () =>
      scenario === "S7"
        ? runScenario("S1", n.brands, n.parameters, options).result
        : null,
    [scenario, n, options],
  );
  const sensitivity = useMemo(() => {
    if (axis === "brands")
      return Array.from({ length: activeBrands.length }, (_, i) => i + 1).map(
        (x) => {
          const b = activeBrands.slice(0, x);
          return {
            x,
            values: [
              projection(
                b,
                n.parameters,
                Math.round(b.reduce((a, b) => a + b.weeklyMean, 0)),
              ).perReturn ?? 0,
            ],
          };
        },
      );
    if (axis === "schedules")
      return [1, 2, 3].map((x) => ({
        x,
        values: [
          projection(activeBrands, n.parameters, natural, x).perReturn ?? 0,
        ],
      }));
    if (axis === "wage")
      return [250, 350, 500, 650, 800, 1000].map((x) => ({
        x,
        values: [
          projection(
            activeBrands,
            { ...n.parameters, wagePerMinute: x },
            natural,
          ).perReturn ?? 0,
        ],
      }));
    return [5, 10, 20, 30, 42, 55, 70, 100, 150, 200].map((x) => ({
      x,
      values: [
        projection(activeBrands, n.parameters, x, options.schedules)
          .perReturn ?? 0,
      ],
    }));
  }, [axis, n, options.schedules, run.options.leaveBrand]);
  return (
    <>
      <div className="scenario-grid">
        {scenarios.map((x) => (
          <button
            key={x.id}
            className={`scenario ${scenario === x.id ? "selected" : ""}`}
            onClick={() => setScenario(x.id)}
          >
            <span>{x.id}</span>
            <strong>{x.name}</strong>
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              {scenario} · {scenarios.find((x) => x.id === scenario)?.name}
            </h2>
            <p>{scenarios.find((x) => x.id === scenario)?.description}</p>
          </div>
          <span className="badge">
            Eksperimen terisolasi · data operasi tetap
          </span>
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            setOptions({ ...draft });
          }}
        >
          <label>
            Seed
            <input
              type="number"
              required
              min="0"
              max="999999"
              value={draft.seed}
              onChange={(e) =>
                setDraft({ ...draft, seed: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Minggu
            <input
              type="number"
              required
              min="2"
              max="12"
              value={draft.weeks}
              onChange={(e) =>
                setDraft({ ...draft, weeks: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Pengali rerata Poisson
            <input
              type="number"
              step="0.05"
              required
              min="0.05"
              max="4"
              value={draft.multiplier}
              onChange={(e) =>
                setDraft({ ...draft, multiplier: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Jadwal / minggu
            <select
              value={draft.schedules}
              onChange={(e) =>
                setDraft({ ...draft, schedules: Number(e.target.value) })
              }
            >
              <option value="1">1 · Jumat</option>
              <option value="2">2 · Selasa, Jumat</option>
              <option value="3">3 · Senin, Rabu, Jumat</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            <RefreshCw size={16} />
            Jalankan simulasi
          </button>
        </form>
        <p className="caption">
          Rerata per merek:{" "}
          {n.brands.map((b) => `${b.name} ${b.weeklyMean}`).join(" · ")}{" "}
          retur/minggu. S2 memakai pengali 0,15; S3 memberi lonjakan 6× di
          minggu kedua.
        </p>
      </section>
      <div className="metrics">
        <Metric
          title="Ongkos impas / retur"
          value={money(s.costs.breakEvenFee)}
          detail={`${s.count} retur · ${num(s.weeklyVolume)} / minggu`}
        />
        <Metric
          title="Penyelesaian rata-rata"
          value={`${num(s.averageDays)} hari`}
          detail={`P90 ${num(s.p90Days)} hari · ${s.completed} selesai; ${s.incidents} sengketa dikecualikan`}
        />
        <Metric
          title="Antrean puncak"
          value={`${s.maxQueue} barang`}
          detail={`${num(s.averageQueueDays)} hari antrean rata-rata`}
        />
        <Metric
          title="Titik impas proyeksi"
          value={density ? `${density} / minggu` : "Tidak ditemukan"}
          detail={
            density
              ? `${Math.max(0, Math.ceil(density - s.weeklyVolume))} retur/minggu di bawah ambang`
              : "Pencarian hingga 1.000 retur"
          }
          tone="mint"
        />
      </div>
      {!assessment.allViable && (
        <div className="warning-strip">
          <AlertTriangle />
          <div>
            <strong>Di bawah titik impas</strong>
            <p>
              Belum semua merek memperoleh penghematan pada kepadatan ini.
              Ambang proyeksi belum memperhitungkan antrean stokastik.
            </p>
          </div>
        </div>
      )}
      {!!run.messages.length && (
        <div className="panel">
          <h2>Hasil pemeriksaan skenario</h2>
          {run.messages.map((m) => (
            <p className="notification" key={m}>
              <Check size={16} />
              {m}
            </p>
          ))}
        </div>
      )}
      <div className="two-col">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Analisis sensitivitas</h2>
              <p>Proyeksi deterministik, tanpa antrean operator</p>
            </div>
            <select
              aria-label="Dimensi sensitivitas"
              value={axis}
              onChange={(e) => setAxis(e.target.value)}
            >
              <option value="volume">Volume / minggu</option>
              <option value="brands">Jumlah merek</option>
              <option value="schedules">Jadwal / minggu</option>
              <option value="wage">Upah / menit</option>
            </select>
          </div>
          <LineChart
            points={sensitivity}
            series={["Biaya BALIKIN"]}
            format={(v) => `${Math.round(v / 1000)} rb`}
            label={`Sensitivitas biaya terhadap ${axis}`}
          />
          <p className="caption">
            {axis === "brands"
              ? "Merek ditambahkan sesuai urutan seed, dengan rerata alaminya. Volume ikut berubah."
              : axis === "volume"
                ? "Komposisi volume mengikuti rerata tiap merek."
                : `Volume tetap ${natural} retur/minggu, merek aktif.`}
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Jangan bertaruh pada satu angka.</h2>
              <p>Monte Carlo · 200 putaran · seed dapat diulang</p>
            </div>
          </div>
          <p>
            Rentang P5–P95 memperhitungkan variasi jumlah retur, batch, antrean,
            dan kejadian kerusakan/kehilangan. Kerugian aktual menggantikan
            cadangan risiko agar tidak dihitung dua kali.
          </p>
          <button
            className="button primary"
            disabled={calculating}
            onClick={mcTask.start}
          >
            {calculating
              ? `Menghitung ${mcTask.progress}/200…`
              : "Jalankan Monte Carlo"}
            <ArrowUpRight size={16} />
          </button>
          {calculating && (
            <>
              <button className="button" onClick={mcTask.cancel}>
                Batalkan perhitungan
              </button>
              <progress
                aria-label="Progres Monte Carlo"
                max={200}
                value={mcTask.progress}
              />
            </>
          )}
          {mcTask.error && (
            <p role="alert" className="negative">
              {mcTask.error}
            </p>
          )}
          {mc && (
            <div className="mc-result">
              <strong>
                {money(mc.low)} — {money(mc.high)}
              </strong>
              <p>P5–P95 · median {money(mc.median)}</p>
              <small>
                {mc.runs} putaran · {mc.empty} putaran tanpa retur (dikecualikan
                dari rasio)
              </small>
            </div>
          )}
          <p className="caption">
            Rentang simulasi, bukan interval kepercayaan data lapangan.
          </p>
        </section>
      </div>
      <div className="metrics secondary">
        <Metric
          title="Utilisasi berat / volume"
          value={`${num(s.utilizationKg * 100)}% / ${num(s.utilizationVolume * 100)}%`}
          detail={`${s.halfEmpty} dari ${s.batchCount} batch kurang dari separuh kapasitas`}
        />
        <Metric
          title="Layak jual / perbaikan"
          value={`${num(s.resellable * 100)}% / ${num(s.count ? (s.records.filter((r) => r.inspection?.decision === "perlu_perbaikan" && !r.incident).length / s.count) * 100 : 0)}%`}
          detail={`${num(s.count ? (s.records.filter((r) => r.inspection?.decision === "rusak" || r.incident).length / s.count) * 100 : 0)}% rusak/hilang · kategori tanpa tumpang tindih`}
        />
        <Metric
          title="Sengketa / insiden"
          value={`${s.incidents} barang`}
          detail={`${num(s.count ? (s.incidents / s.count) * 100 : 0)}% dari retur simulasi`}
        />
        <Metric
          title="Kerugian aktual"
          value={money(s.actualLoss)}
          detail={`${s.operatingWeeks} minggu biaya titik termasuk ekor antrean`}
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Biaya penuh per merek</h2>
            <button
              className="text-link"
              onClick={() =>
                downloadReport(
                  [
                    ["Skenario", scenario],
                    ["Seed", options.seed],
                    ["Minggu", options.weeks],
                    ["Ongkos impas", s.costs.perReturn],
                    [
                      "Merek",
                      "Retur",
                      "Biaya per retur",
                      "Biaya kini",
                      "Lebih hemat",
                    ],
                    ...assessment.byBrand.map((b) => [
                      b.name,
                      s.costs.byBrand.find((c) => c.brandId === b.brandId)!
                        .count,
                      b.cost,
                      b.baseline,
                      b.viable ? "Ya" : "Tidak",
                    ]),
                  ],
                  `balikin-${scenario}-${options.seed}.csv`,
                )
              }
            >
              Unduh hasil CSV <ArrowUpRight size={14} />
            </button>
            <p>
              Cadangan risiko probabilistik digunakan pada ongkos impas utama.
            </p>
          </div>
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
                <th>Merek</th>
                <th>Retur</th>
                <th>Tenaga kerja</th>
                <th>Tetap titik</th>
                <th>Kemasan</th>
                <th>Angkut</th>
                <th>Risiko</th>
                <th>Simpan</th>
                <th>Platform</th>
                <th>Per retur</th>
                {scenario === "S7" && <th>Sebelum keluar</th>}
              </tr>
            </thead>
            <tbody>
              {s.costs.byBrand.map((b) => (
                <tr key={b.brandId}>
                  <td>{n.brands.find((x) => x.id === b.brandId)?.name}</td>
                  <td>{b.count}</td>
                  {Object.values(b.parts).map((v, i) => (
                    <td key={i}>{money(v)}</td>
                  ))}
                  <td>
                    <b>{money(b.perReturn)}</b>
                  </td>
                  {scenario === "S7" && (
                    <td>
                      {money(
                        before?.costs.byBrand.find(
                          (x) => x.brandId === b.brandId,
                        )?.perReturn,
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {scenario === "S7" && (
          <p className="caption">
            Sebelum/sesudah memakai kedatangan dan mutu barang yang sama untuk
            merek tersisa. Selisih mencakup alokasi biaya tetap dan berkurangnya
            antrean setelah satu merek keluar.
          </p>
        )}
      </section>
      <Means n={n} act={act} />
      <Parameters n={n} act={act} />
    </>
  );
}
