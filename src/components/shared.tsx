"use client";
import type { Action } from "@/domain/operations";
import type { Network, ReturnRecord } from "@/domain/types";
import { Boxes } from "lucide-react";
import { useState } from "react";
export const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n);
export const num = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : n.toLocaleString("id-ID", { maximumFractionDigits: d });
export const date = (s?: string) =>
  s
    ? new Date(s).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export const label = (s: string) => {
  const t = s.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${["selesai", "layak_jual", "diterima_merek"].includes(value) ? "good" : ["sengketa", "tidak_sesuai", "qr_kedaluwarsa", "rusak"].includes(value) ? "bad" : ""}`}
    >
      {label(value)}
    </span>
  );
}
export function Metric({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className={`metric ${tone ?? ""}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Boxes size={28} />
      <p>{children}</p>
    </div>
  );
}
export function LoadingSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Memuat jaringan lokal…</span>
      <div className="metrics" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="metric skeleton-card">
            <i className="sk sk-line short" />
            <i className="sk sk-line big" />
            <i className="sk sk-line" />
          </div>
        ))}
      </div>
      <div className="dashboard-grid" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="panel skeleton-card">
            <i className="sk sk-line med" />
            <i className="sk sk-line short" />
            <i className="sk sk-block" />
          </div>
        ))}
      </div>
      <p className="skeleton-caption" aria-hidden="true">
        <Boxes size={16} /> Menyiapkan data jaringan…
      </p>
    </div>
  );
}
export type Props = {
  n: Network;
  act: (a: Action) => Promise<Network | undefined>;
};
export function ReturnTable({
  records,
  n,
  children,
}: {
  records: ReturnRecord[];
  n: Network;
  children?: (r: ReturnRecord) => React.ReactNode;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0);
  const filtered = records.filter(
      (r) =>
        (!status || r.status === status) &&
        [
          r.id,
          r.orderId,
          r.item.id,
          n.brands.find((b) => b.id === r.brandId)?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    ),
    pages = Math.max(1, Math.ceil(filtered.length / 10)),
    current = Math.min(page, pages - 1);
  return (
    <>
      <div className="table-controls">
        <label className="grow">
          Cari retur
          <input
            type="search"
            placeholder="Kode retur, pesanan, barang, atau merek"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Filter status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Semua status</option>
            {[...new Set(records.map((r) => r.status))].map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!filtered.length ? (
        <Empty>
          {records.length
            ? "Tidak ada retur yang cocok dengan pencarian."
            : "Belum ada retur pada antrean ini."}
        </Empty>
      ) : (
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Tabel data, dapat digeser"
        >
          <table>
            <thead>
              <tr>
                <th>Retur / pesanan</th>
                <th>Merek / barang</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(current * 10, current * 10 + 10).map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.id}</b>
                    <small>{r.orderId}</small>
                  </td>
                  <td>
                    {n.brands.find((b) => b.id === r.brandId)?.name}
                    <small>{r.item.id}</small>
                  </td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                  <td>
                    <div className="actions">{children?.(r)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <span>
          {filtered.length} retur · halaman {current + 1} dari {pages}
        </span>
        <button
          className="button small"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Sebelumnya
        </button>
        <button
          className="button small"
          disabled={current + 1 >= pages}
          onClick={() => setPage(current + 1)}
        >
          Berikutnya
        </button>
      </div>
    </>
  );
}
