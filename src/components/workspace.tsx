"use client";
import type { Action } from "@/domain/operations";
import type { Network } from "@/domain/types";
import logo from "../../public/logo.png";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  ChevronRight,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  PackageCheck,
  Scale,
  ScanLine,
  Store,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Batches } from "./batches";
import { Brands } from "./brands";
import { Buyer } from "./buyer";
import { Dashboard } from "./dashboard";
import { Evaluation } from "./evaluation";
import { Operator } from "./operator";
import { Empty } from "./shared";
import { Simulator } from "./simulator";
const tabs = [
  { name: "Dasbor jaringan", icon: LayoutDashboard },
  { name: "Portal merek", icon: Store },
  { name: "Portal pembeli", icon: PackageCheck },
  { name: "Titik penerimaan", icon: ScanLine },
  { name: "Perencana batch", icon: Boxes },
  { name: "Simulator biaya", icon: ChartNoAxesCombined },
  { name: "Evaluasi model", icon: Scale },
];
const titles = [
  "Gambaran jaringan",
  "Ruang kerja merek",
  "Retur tanpa repot",
  "Meja penerimaan",
  "Satu perjalanan, banyak retur.",
  "Kepadatan menentukan segalanya.",
  "Apakah bersama lebih hemat?",
];
export default function Workspace() {
  const [n, setN] = useState<Network | null>(null),
    [tab, setTab] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [mobile, setMobile] = useState(false);
  const actionPending = useRef(false);
  useEffect(() => {
    fetch("/api/network")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setN(data);
      })
      .catch((e) => setError(e.message));
    const sync = () => {
      const t = Number(new URLSearchParams(window.location.search).get("page"));
      setTab(Number.isInteger(t) && t >= 0 && t < tabs.length ? t : 0);
      setMobile(false);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const navigate = (i: number) => {
    setTab(i);
    setMobile(false);
    setNotice("");
    setError("");
    window.history.pushState(null, "", `?page=${i}`);
  };
  async function act(action: Action) {
    if (!n || actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/network", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, version: n.version }),
        }),
        data = await response.json();
      if (response.status === 409) {
        const fresh = await fetch("/api/network", { cache: "no-store" });
        if (fresh.ok) setN(await fresh.json());
      }
      if (!response.ok) throw Error(data.error);
      setN(data);
      setNotice("Perubahan tersimpan di jaringan lokal.");
      return data as Network;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <aside
        id="main-navigation"
        className={mobile ? "sidebar open" : "sidebar"}
      >
        <Link className="brand" href="/profil" aria-label="Profil BALIKIN">
          <Image src={logo} alt="BALIKIN" height={74} preload />
        </Link>
        <div className="workspace-label">
          RUANG KERJA <span>MVP 01</span>
        </div>
        <div className="network-select">
          <span className="network-avatar">BU</span>
          <div>
            Bandung Utara<small>Jaringan percontohan</small>
          </div>
          <ChevronRight size={16} />
        </div>
        <div className="nav-label">KELOLA JARINGAN</div>
        <nav>
          {tabs.map((t, i) => (
            <button
              key={t.name}
              aria-label={t.name}
              className={tab === i ? "nav-item active" : "nav-item"}
              aria-current={tab === i ? "page" : undefined}
              onClick={() => navigate(i)}
            >
              <t.icon size={19} />
              {t.name}
              {i === 5 && <span className="new-tag">INTI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={22} />
          <strong>Retur gampang, tinggal Balikin.</strong>
          <p>
            Satu titik untuk banyak merek.
            <br />
            Uji kecil, pelajari bersama.
          </p>
          <Link className="profile-link" href="/profil">
            Lihat profil perusahaan <ArrowRight size={13} />
          </Link>
          <span>
            <i />
            Mode simulasi lokal
          </span>
        </div>
        <div className="profile">
          <div className="avatar">AN</div>
          <div>
            Admin jaringan<small>Akses demo · semua peran</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Tutup menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main">
        <header className="topbar">
          <button
            className="mobile-toggle icon-button"
            onClick={() => setMobile(!mobile)}
            aria-label={mobile ? "Tutup navigasi" : "Buka navigasi"}
            aria-expanded={mobile}
            aria-controls="main-navigation"
          >
            <Menu />
          </button>
          <div>
            Jaringan percontohan <ChevronRight size={14} />{" "}
            <b>{tabs[tab].name}</b>
          </div>
          <span className="sandbox">
            <i />
            SANDBOX <span>· Tidak ada transaksi nyata</span>
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div className="eyebrow">RETUR BERSAMA, DIUKUR DENGAN DATA</div>
            <div className="title-row">
              <div>
                <h1>{titles[tab]}</h1>
                <p>
                  {tab === 0
                    ? "Lihat kesehatan operasi dan ekonomi retur dalam satu kawasan."
                    : "Jaringan Bandung Utara · 5 merek lokal · 1 titik penerimaan"}
                </p>
              </div>
              <span className="location">
                <MapPin size={16} />
                Bandung Utara, ID
              </span>
            </div>
          </div>
          {error && (
            <div role="alert" className="notice error">
              {error}
              <button onClick={() => window.location.reload()}>
                Muat ulang
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice success">
              {notice}
              <button
                aria-label="Tutup notifikasi"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {!n ? (
            <Empty>
              {error ? "Gagal memuat jaringan." : "Memuat jaringan lokal…"}
            </Empty>
          ) : (
            <div
              aria-busy={busy}
              className={busy ? "content busy" : "content"}
              inert={busy}
            >
              {tab === 0 ? (
                <Dashboard n={n} navigate={navigate} />
              ) : tab === 1 ? (
                <Brands n={n} act={act} />
              ) : tab === 2 ? (
                <Buyer n={n} act={act} />
              ) : tab === 3 ? (
                <Operator n={n} act={act} />
              ) : tab === 4 ? (
                <Batches n={n} act={act} />
              ) : tab === 5 ? (
                <Simulator n={n} act={act} />
              ) : (
                <Evaluation n={n} />
              )}
            </div>
          )}
          <footer>
            BALIKIN <span>Laboratorium retur bersama</span>
            <Link href="/profil">Profil perusahaan</Link>
            <span className="footnote">
              Data sintetis & asumsi · Bukan bukti kelayakan bisnis
            </span>
            <span className="copyright">© 2026 Vassel Goleyu</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
