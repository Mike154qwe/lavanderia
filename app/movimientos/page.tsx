import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MovimientosPage() {
  const pedidos = await prisma.pedido.findMany({
    include: {
      cliente: true,
      prendas: true,
      historial: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const year = new Date().getFullYear();

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="p-8">
        <div className="rounded-3xl bg-white p-8 shadow">
          <h1 className="text-4xl font-bold text-slate-900">
            Entradas y salidas
          </h1>

          <p className="mt-2 text-slate-500">
            Historial operacional organizado por meses y días.
          </p>
        </div>

        <div className="mt-8 grid gap-8">
          {meses.map((mes, mesIndex) => {
            const diasDelMes = new Date(
              year,
              mesIndex + 1,
              0
            ).getDate();

            return (
              <div
                key={mes}
                className="rounded-3xl bg-white p-6 shadow"
              >
                <h2 className="text-3xl font-bold text-slate-900">
                  {mes}
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-4 xl:grid-cols-7">
                  {Array.from({
                    length: diasDelMes,
                  }).map((_, dayIndex) => {
                    const dia = dayIndex + 1;

                    const pedidosDia =
                      pedidos.filter((pedido) => {
                        const fecha =
                          pedido.createdAt;

                        return (
                          fecha.getFullYear() ===
                            year &&
                          fecha.getMonth() ===
                            mesIndex &&
                          fecha.getDate() === dia
                        );
                      });

                    const entradas =
                      pedidosDia.length;

                    const salidas =
                      pedidos.filter((pedido) =>
                        (pedido as any).historial.some(
                          (h: any) =>
                            h.estado ===
                              "ENTREGADO" &&
                            h.createdAt.getFullYear() ===
                              year &&
                            h.createdAt.getMonth() ===
                              mesIndex &&
                            h.createdAt.getDate() ===
                              dia
                        )
                      ).length;

                    const prendas =
                      pedidosDia.reduce(
                        (sum, pedido) =>
                          sum +
                          pedido.prendas.reduce(
                            (s, prenda) =>
                              s +
                              prenda.cantidad,
                            0
                          ),
                        0
                      );

                    const fechaLink = `${year}-${String(
                      mesIndex + 1
                    ).padStart(2, "0")}-${String(
                      dia
                    ).padStart(2, "0")}`;

                    const activo =
                      entradas > 0 ||
                      salidas > 0;

                    return (
                      <Link
                        key={dia}
                        href={`/movimientos/dia/${fechaLink}`}
                        className={`rounded-2xl border p-4 transition hover:scale-[1.02] hover:shadow-md ${
                          activo
                            ? "border-teal-300 bg-teal-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold text-slate-800">
                            {dia}
                          </p>

                          {activo && (
                            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700">
                              Activo
                            </span>
                          )}
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-slate-600">
                          <p>
                            Entradas:{" "}
                            <b>{entradas}</b>
                          </p>

                          <p>
                            Salidas:{" "}
                            <b>{salidas}</b>
                          </p>

                          <p>
                            Prendas:{" "}
                            <b>{prendas}</b>
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}