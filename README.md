<p align="center">
  <img src="public/logo.png" alt="BALIKIN" width="260" />
</p>

<h3 align="center">Retur gampang, tinggal Balikin.</h3>

<p align="center">
  Jaringan retur bersama untuk merek lokal: retur dari banyak merek dikumpulkan di satu titik dekat pembeli, lalu dipulangkan dalam satu perjalanan.
</p>

---

## Profil perusahaan

![Profil BALIKIN](docs/screenshots/profil.png)

## Aplikasi

| Dasbor jaringan | Simulator biaya |
| --- | --- |
| ![Dasbor](docs/screenshots/dasbor.png) | ![Simulator](docs/screenshots/simulator.png) |
| **Portal merek** | **Portal pembeli** |
| ![Portal merek](docs/screenshots/portal-merek.png) | ![Portal pembeli](docs/screenshots/portal-pembeli.png) |
| **Titik penerimaan** | **Perencana batch** |
| ![Titik penerimaan](docs/screenshots/titik-penerimaan.png) | ![Perencana batch](docs/screenshots/perencana-batch.png) |
| **Evaluasi model** | **Tampilan ponsel** |
| ![Evaluasi](docs/screenshots/evaluasi.png) | <img src="docs/screenshots/mobile-profil.png" width="48%" /> <img src="docs/screenshots/mobile-dasbor.png" width="48%" /> |

## Fitur utama

- **Portal pembeli:** ajukan retur, dapatkan QR serah terima, lacak status.
- **Portal merek:** atur kebijakan retur, setujui pengajuan, pantau biaya per barang.
- **Titik penerimaan:** terima barang lewat QR, foto bukti, inspeksi, dan sengketa.
- **Perencana batch:** gabungkan retur per merek ke satu perjalanan pulang.
- **Simulator biaya & evaluasi model:** skenario S1–S7, Monte Carlo, dan perbandingan dengan kurir individual.

## Menjalankan

```bash
npm install
npm run dev        # http://127.0.0.1:3000  ·  profil di /profil
npm test           # tes unit
npm run test:e2e   # tes browser (Playwright)
```

Dibangun dengan Next.js, React, TypeScript, dan Tailwind CSS. Semua data adalah data sintetis (mode sandbox).

## Lisensi

© 2026 Vassel Goleyu. All rights reserved. Lihat [LICENSE](LICENSE).
