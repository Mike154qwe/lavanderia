import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen p-8">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <Link href="/clientes/nuevo" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            Nuevo cliente
          </Link>
        </div>

        <div className="mt-6 rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-3">Nombre</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Dirección</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b">
                  <td className="p-3">{cliente.nombre}</td>
                  <td className="p-3">{cliente.telefono ?? "-"}</td>
                  <td className="p-3">{cliente.direccion ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
