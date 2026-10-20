import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BALIKIN · Laboratorium retur bersama",
  description:
    "Uji kepadatan, biaya, dan operasi retur bersama untuk merek lokal.",
  authors: [{ name: "Vassel Goleyu" }],
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
