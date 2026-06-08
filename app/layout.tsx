import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Sistema Lavandería",
  description: "Sistema local para gestión de lavandería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
