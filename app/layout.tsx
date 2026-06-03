import "./globals.css";

export const metadata = {
  title: "Sistema Lavandería",
  description: "Sistema local para gestión de lavandería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
