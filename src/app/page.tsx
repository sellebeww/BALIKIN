import { brands } from "@/domain/seed";
import {
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  Coins,
  MapPin,
  PackageCheck,
  QrCode,
  ScanLine,
  Store,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "../../public/logo.png";
import mark from "../../public/logo-mark.png";
import "./profil.css";
import { Reveal } from "./reveal";

export const metadata: Metadata = {
  title: "BALIKIN · Retur bersama untuk merek lokal",
  description:
    "BALIKIN menyatukan retur banyak merek lokal di satu titik dekat pembeli, lalu memulangkannya dalam satu perjalanan.",
};

const steps = [
  {
    icon: PackageCheck,
    title: "Ajukan retur",
    text: "Pembeli mengajukan lewat portal, merek menyetujui dengan aturan yang jelas.",
  },
  {
    icon: QrCode,
    title: "Serahkan di titik",
    text: "Tunjukkan QR di titik penerimaan terdekat. Foto bukti diambil saat serah terima.",
  },
  {
    icon: ScanLine,
    title: "Inspeksi & batch",
    text: "Operator memeriksa barang, lalu menggabungkannya ke batch per merek.",
  },
  {
    icon: Truck,
    title: "Balik ke merek",
    text: "Satu perjalanan membawa banyak retur pulang. Ongkos angkut dibagi bersama.",
  },
];
const perks = [
  {
    icon: Coins,
    title: "Ongkos dibagi",
    text: "Biaya angkut dan titik dipakai bersama, bukan ditanggung satu merek sendirian.",
  },
  {
    icon: BadgeCheck,
    title: "Bukti yang jelas",
    text: "QR, foto dua pihak, dan jejak waktu setiap status. Sengketa punya catatan.",
  },
  {
    icon: MapPin,
    title: "Dekat pembeli",
    text: "Cukup mampir ke titik di kawasan sendiri, tanpa antre kurir atau bungkus ulang.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Diukur dengan data",
    text: "Simulator dan evaluasi model menunjukkan kapan jaringan benar-benar lebih hemat.",
  },
];
const roles = [
  {
    icon: Store,
    title: "Merek lokal",
    text: "Atur kebijakan retur, setujui pengajuan, dan pantau biaya per barang.",
  },
  {
    icon: UserRound,
    title: "Pembeli",
    text: "Ajukan retur dalam menit, simpan QR, lacak sampai dana kembali.",
  },
  {
    icon: Warehouse,
    title: "Operator titik",
    text: "Terima, periksa, dan kirim batch dari satu meja kerja.",
  },
];

export default function Profil() {
  return (
    <div className="pf">
      <Reveal />
      <header className="pf-nav">
        <Link href="/" aria-label="BALIKIN beranda profil">
          <Image src={logo} alt="BALIKIN" height={46} preload />
        </Link>
        <nav aria-label="Bagian halaman">
          <a href="#tentang">Tentang</a>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#keunggulan">Keunggulan</a>
          <a href="#peran">Untuk siapa</a>
        </nav>
        <Link className="pf-btn" href="/aplikasi">
          Buka aplikasi <ArrowRight size={16} />
        </Link>
      </header>

      <section className="pf-hero">
        <div className="pf-blob a" />
        <div className="pf-blob b" />
        <div className="pf-blob c" />
        <div className="pf-hero-copy">
          <span className="pf-eyebrow">
            <i /> Jaringan retur bersama · Bandung Utara
          </span>
          <h1>
            Retur gampang,
            <br />
            tinggal <em>Balikin.</em>
          </h1>
          <p>
            BALIKIN menyatukan retur dari banyak merek lokal di satu titik dekat
            pembeli, lalu memulangkannya dalam satu perjalanan. Lebih ringan
            untuk merek, lebih praktis untuk pembeli.
          </p>
          <div className="pf-cta">
            <Link className="pf-btn big" href="/aplikasi">
              Masuk ke aplikasi <ArrowRight size={18} />
            </Link>
            <a className="pf-btn ghost big" href="#cara-kerja">
              Lihat cara kerja
            </a>
          </div>
        </div>
        <div className="pf-hero-art" aria-hidden>
          <div className="pf-orbit" />
          <div className="pf-orbit two" />
          <Image
            className="pf-mark"
            src={mark}
            alt=""
            width={420}
            style={{ height: "auto" }}
            preload
          />
          <span className="pf-spark s1">✦</span>
          <span className="pf-spark s2">✦</span>
          <span className="pf-spark s3">✦</span>
          <div className="pf-chip c1">
            <QrCode size={16} /> QR serah terima siap
          </div>
          <div className="pf-chip c2">
            <BadgeCheck size={16} /> Inspeksi lolos
          </div>
          <div className="pf-chip c3">
            <Truck size={16} /> Batch berangkat · 12 barang
          </div>
        </div>
      </section>

      <div className="pf-marquee" aria-label="Merek percontohan">
        <div>
          {[0, 1].map((k) =>
            [...brands, ...brands].map((b, i) => (
              <span
                key={`${k}-${i}`}
                aria-hidden={k === 1 || i >= brands.length}
              >
                <Store size={16} /> {b.name}
              </span>
            )),
          )}
        </div>
      </div>

      <section id="tentang" className="pf-section pf-about">
        <div data-reveal>
          <span className="pf-eyebrow">Tentang kami</span>
          <h2>Satu titik, banyak merek, satu perjalanan pulang.</h2>
        </div>
        <div data-reveal className="pf-about-text">
          <p>
            Merek lokal kecil sering membayar mahal untuk setiap barang yang
            dikembalikan: kurir satuan, bungkus ulang, dan waktu admin. BALIKIN
            lahir dari ide sederhana: kalau retur dikumpulkan bersama, ongkosnya
            bisa dibagi.
          </p>
          <div className="pf-vm">
            <div>
              <b>Visi</b>
              <p>Retur yang adil dan ringan untuk ekosistem merek lokal.</p>
            </div>
            <div>
              <b>Misi</b>
              <p>
                Membangun jaringan titik retur bersama yang diuji dengan data,
                bukan asumsi.
              </p>
            </div>
          </div>
        </div>
        <div className="pf-stats">
          {[
            [brands.length, "merek percontohan"],
            [1, "titik penerimaan bersama"],
            [7, "modul kerja dalam aplikasi"],
            [4, "langkah dari pengajuan ke merek"],
          ].map(([v, l], i) => (
            <div key={l} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <strong>{v}</strong>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="pf-section">
        <div data-reveal className="pf-head">
          <span className="pf-eyebrow">Cara kerja</span>
          <h2>Dari pembeli kembali ke merek, dalam empat langkah.</h2>
        </div>
        <svg
          className="pf-route"
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            id="pf-route-path"
            d="M20 90 C 200 10, 320 110, 500 60 S 800 10, 980 70"
          />
          <g className="pf-runner">
            <rect x="-14" y="-12" width="28" height="24" rx="6" />
            <animateMotion dur="7s" repeatCount="indefinite" rotate="auto">
              <mpath href="#pf-route-path" />
            </animateMotion>
          </g>
        </svg>
        <ol className="pf-steps">
          {steps.map((s, i) => (
            <li
              key={s.title}
              data-reveal
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <span className="pf-num">{i + 1}</span>
              <s.icon size={26} />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="keunggulan" className="pf-section">
        <div data-reveal className="pf-head">
          <span className="pf-eyebrow">Keunggulan</span>
          <h2>Kenapa retur bareng lebih masuk akal.</h2>
        </div>
        <div className="pf-cards">
          {perks.map((p, i) => (
            <article
              key={p.title}
              data-reveal
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span>
                <p.icon size={24} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="peran" className="pf-section">
        <div data-reveal className="pf-head">
          <span className="pf-eyebrow">Untuk siapa</span>
          <h2>Satu aplikasi, tiga peran.</h2>
        </div>
        <div className="pf-role-grid">
          {roles.map((r, i) => (
            <div
              key={r.title}
              data-reveal
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <r.icon size={30} />
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pf-band" data-reveal>
        <Image
          src={mark}
          alt=""
          width={140}
          style={{ height: "auto" }}
          className="pf-band-mark"
        />
        <div>
          <h2>Siap mencoba jaringan retur bersama?</h2>
          <p>Jelajahi dasbor, portal merek, dan simulator biaya di sandbox.</p>
        </div>
        <Link className="pf-btn light big" href="/aplikasi">
          Buka aplikasi <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="pf-footer">
        <Image src={logo} alt="BALIKIN" height={56} />
        <span>Retur bersama untuk merek lokal · Bandung Utara</span>
        <Link href="/aplikasi">Aplikasi</Link>
        <span>© 2026 BALIKIN · Prototipe dengan data sintetis</span>
      </footer>
    </div>
  );
}
