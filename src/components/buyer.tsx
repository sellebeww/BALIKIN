"use client";
import { ArrowRight, MapPin, PackageCheck, ScanLine } from "lucide-react";
import { useState } from "react";
import { Badge, date, Empty, type Props } from "./shared";
export function Buyer({ n, act }: Props) {
  const [brand, setBrand] = useState(n.brands[0].id),
    [initials, setInitials] = useState("AN"),
    [orderId, setOrderId] = useState(""),
    [reason, setReason] = useState("Ukuran tidak sesuai"),
    [selected, setSelected] = useState("");
  const order = n.orders.find((o) => o.id === orderId),
    r = n.returns.find((r) => r.id === selected);
  return (
    <div className="two-col">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ajukan pengembalian</h2>
            <p>Tanpa nomor telepon, alamat rumah, atau pembayaran.</p>
          </div>
          <PackageCheck />
        </div>
        <div className="soft-box">
          <strong>Mulai dengan pesanan demo</strong>
          <p>
            Pesanan historis telah memiliki retur. Buat pesanan baru untuk
            mencoba alur lengkap.
          </p>
          <div className="inline-form">
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
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Inisial
              <input
                maxLength={3}
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
              />
            </label>
            <button
              className="button"
              onClick={async () => {
                const result = await act({
                  type: "demoOrder",
                  id: brand,
                  initials,
                });
                if (result) setOrderId(result.orders.at(-1)!.id);
              }}
            >
              Buat pesanan demo
            </button>
          </div>
        </div>
        <form
          className="stack-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await act({
              type: "submit",
              orderId,
              itemId: order?.items[0],
              reason,
            });
            if (result) setSelected(result.returns.at(-1)!.id);
          }}
        >
          <label>
            Kode pesanan
            <input
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ORD-…"
            />
          </label>
          <label>
            Barang pada pesanan
            <input
              readOnly
              value={order?.items[0] ?? "Masukkan kode pesanan yang valid"}
            />
          </label>
          <label>
            Alasan retur
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Ukuran tidak sesuai</option>
              <option>Warna tidak sesuai</option>
              <option>Barang rusak</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Ajukan ke merek <ArrowRight size={17} />
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Status & kode serah</h2>
        <label className="stack-form">
          Pilih retur demo
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Pilih pengajuan</option>
            {n.returns
              .slice()
              .reverse()
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.orderId}
                </option>
              ))}
          </select>
        </label>
        {r ? (
          <>
            <div className="status-card">
              <Badge value={r.status} />
              <h3>{r.id}</h3>
              <p>{r.reason}</p>
              {r.status === "qr_terbit" ? (
                <>
                  <div className="qr-simulation">
                    <ScanLine size={60} />
                    <b>{r.qr}</b>
                    <small>Kode QR simulasi · gunakan di layar operator</small>
                  </div>
                  <p>
                    Barang: <code>{r.item.id}</code>
                  </p>
                  <p>Berlaku hingga {date(r.qrExpiresAt)}</p>
                  <p>
                    <MapPin size={15} /> Titik bersama Bandung Utara
                    <br />
                    Jl. Tamansari 10 (alamat demo)
                    <br />
                    09.00–17.00 WIB · Senin–Minggu
                  </p>
                </>
              ) : (
                <p>
                  {r.status === "diajukan"
                    ? "Menunggu persetujuan. Buka portal merek untuk menyetujui."
                    : "Lihat perkembangan retur di status di atas."}
                </p>
              )}
            </div>
          </>
        ) : (
          <Empty>Pilih pengajuan untuk melihat statusnya.</Empty>
        )}
      </section>
    </div>
  );
}
