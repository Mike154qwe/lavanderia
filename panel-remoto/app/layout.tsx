import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel remoto -- La Manuelita",
  description: "Panel remoto de solo lectura, protegido con Firebase Auth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
