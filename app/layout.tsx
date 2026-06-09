import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Lavaseco La Manuelita",
  description: "Sistema de gestión de lavandería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
