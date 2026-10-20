"use client";
import type { Decision } from "@/domain/types";
import { ScanLine } from "lucide-react";
import { useState } from "react";
import { label, ReturnTable, type Props } from "./shared";
export function Operator({ n, act }: Props) {
  const [qr, setQr] = useState(""),
    [item, setItem] = useState(""),
    [selected, setSelected] = useState(""),
    [photos, setPhotos] = useState("depan.jpg, belakang.jpg"),
    [decision, setDecision] = useState<Decision>("layak_jual"),
    [check, setCheck] = useState<Record<string, boolean>>({
      label_ada: true,
      bekas_pakai: false,
      noda: false,
      kerusakan: false,
      kelengkapan: true,
      bau: false,
      sol_bersih: true,
      ritsleting_utuh: true,
    });
  const r = n.returns.find((r) => r.id === selected);
  const fields = [
    "label_ada",
    "bekas_pakai",
    "noda",
    "kerusakan",
    "kelengkapan",
    "bau",
    ...(r?.item.category === "sepatu"
      ? ["sol_bersih"]
      : r?.item.category === "jaket"
        ? ["ritsleting_utuh"]
        : []),
  ];
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>01 · Pindai & cocokkan</h2>
            <p>
              Masukkan kode simulasi. QR hanya sekali pakai untuk barang yang
              diotorisasi.
            </p>
          </div>
          <ScanLine />
        </div>
        <label>
          Pilih QR demo
          <select
            onChange={(e) => {
              const r = n.returns.find((r) => r.id === e.target.value);
              if (r) {
                setQr(r.qr);
                setItem(r.item.id);
              }
            }}
            defaultValue=""
          >
            <option value="">Pilih otorisasi…</option>
            {n.returns
              .filter((r) => r.status === "qr_terbit")
              .map((r) => (
                <option value={r.id} key={r.id}>
                  {r.id} · {r.item.category}
                </option>
              ))}
          </select>
        </label>
        <div className="inline-form">
          <label className="grow">
            Kode QR
            <input
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="RR-RT-…"
            />
          </label>
          <label className="grow">
            ID barang yang diserahkan
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Cocokkan dengan otorisasi"
            />
          </label>
          <button
            className="button primary"
            onClick={() => act({ type: "receive", qr, itemId: item })}
          >
            Terima barang
          </button>
          <button className="button" onClick={() => act({ type: "expire" })}>
            Tandai QR hangus
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>02 · Pemeriksaan standar</h2>
            <p>
              Checklist per kategori dan minimal {n.parameters.minPhotos} foto
              kondisi.
            </p>
          </div>
        </div>
        <ReturnTable
          n={n}
          records={n.returns.filter((r) =>
            [
              "diserahkan_di_titik",
              "ditahan",
              "tidak_sesuai",
              "diperiksa",
            ].includes(r.status),
          )}
        >
          {(x) => (
            <>
              {x.receipt?.match === "sesuai_otorisasi" &&
                ["diserahkan_di_titik", "ditahan"].includes(x.status) && (
                  <button
                    className="button small"
                    onClick={() => {
                      setSelected(x.id);
                      setDecision("layak_jual");
                      setPhotos("depan.jpg, belakang.jpg");
                      setCheck({
                        label_ada: true,
                        bekas_pakai: false,
                        noda: false,
                        kerusakan: false,
                        kelengkapan: true,
                        bau: false,
                        sol_bersih: true,
                        ritsleting_utuh: true,
                      });
                    }}
                  >
                    Periksa
                  </button>
                )}
              {["tidak_sesuai", "diserahkan_di_titik", "diperiksa"].includes(
                x.status,
              ) && (
                <button
                  className="button small"
                  onClick={() => act({ type: "hold", id: x.id })}
                >
                  Tahan
                </button>
              )}
              {["tidak_sesuai", "ditahan"].includes(x.status) && (
                <button
                  className="button small"
                  onClick={() =>
                    act({
                      type: "escalate",
                      id: x.id,
                      reason: "Operator meminta peninjauan merek",
                    })
                  }
                >
                  Eskalasi ke merek
                </button>
              )}
              {x.status === "diperiksa" && (
                <button
                  className="button small primary"
                  onClick={() => act({ type: "queue", id: x.id })}
                >
                  Masuk antrean batch
                </button>
              )}
            </>
          )}
        </ReturnTable>
        {r && (
          <div className="inspection-form">
            <h3>
              {r.id} · {r.item.category}
            </h3>
            <div className="checklist">
              {fields.map((f) => (
                <label key={f}>
                  <input
                    type="checkbox"
                    checked={check[f]}
                    onChange={(e) =>
                      setCheck({ ...check, [f]: e.target.checked })
                    }
                  />
                  {label(f)}
                </label>
              ))}
            </div>
            <div className="inline-form">
              <label className="grow">
                Nama berkas foto (simulasi, pisahkan koma)
                <input
                  value={photos}
                  onChange={(e) => setPhotos(e.target.value)}
                />
              </label>
              <label>
                Keputusan
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as Decision)}
                >
                  {[
                    "layak_jual",
                    "perlu_perbaikan",
                    "rusak",
                    "tidak_sesuai",
                  ].map((d) => (
                    <option key={d} value={d}>
                      {label(d)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button primary"
                onClick={async () => {
                  const result = await act({
                    type: "inspect",
                    id: r.id,
                    checklist: check,
                    photos: photos
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    decision,
                  });
                  if (result) setSelected("");
                }}
              >
                Simpan pemeriksaan
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
