import GastosEmpleadoClient from "./GastosEmpleadoClient";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/\D/g, ""));
}

async function registrarGastoEmpleado(formData: FormData) {
  "use server";

  const tipo = String(formData.get("tipo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const valor = parseMoney(formData.get("valor"));
  const metodo = String(formData.get("metodo") || "Efectivo");
  const responsable = String(
    formData.get("responsable") || "Empleado"
  ).trim();

  if (!tipo || valor <= 0) {
    return;
  }

  await (prisma as any).gastoCaja.create({
    data: {
      tipo,
      descripcion: descripcion || null,
      valor,
      metodo,
      responsable,
    },
  });

  revalidatePath("/gastos-empleado");
  revalidatePath("/gerente");

  redirect("/gastos-empleado");
}

export default async function GastosEmpleadoPage() {
  const hoy = new Date();

  const inicio = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  const fin = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() + 1
  );

  const gastos: any[] = await (prisma as any).gastoCaja.findMany({
    where: {
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalGastos = gastos.reduce(
    (sum: number, gasto: any) => sum + gasto.valor,
    0
  );

  const tipos = [
    { tipo: "Jabones", emoji: "🧼" },
    { tipo: "Insumos", emoji: "🧴" },
    { tipo: "Pago empleado", emoji: "👤" },
    { tipo: "Pago prensista", emoji: "👔" },
    { tipo: "Nómina", emoji: "💵" },
    { tipo: "Novedad", emoji: "⚠️" },
    { tipo: "Otro", emoji: "📝" },
  ];

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="p-8">
        <div className="card p-8">
          <p className="text-lg font-black text-red-600">
            Gastos del día
          </p>

          <h1 className="mt-2 text-5xl font-black text-slate-900">
            Registro de gastos
          </h1>

          <p className="mt-3 text-xl text-slate-500">
            Registra gastos rápidos para que aparezcan en finanzas.
          </p>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_1fr]">
          <form
            action={registrarGastoEmpleado}
            className="card p-8"
          >
            <h2 className="text-4xl font-black text-slate-900">
              Nuevo gasto
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {tipos.map((item) => (
                <label
                  key={item.tipo}
                  className="cursor-pointer rounded-3xl border-2 border-slate-200 bg-white p-6 text-center transition hover:border-red-300 hover:bg-red-50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50 has-[:checked]:ring-2 has-[:checked]:ring-red-300"
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={item.tipo}
                    required
                    className="sr-only"
                  />

                  <div className="text-6xl">
                    {item.emoji}
                  </div>

                  <p className="mt-3 text-2xl font-black text-slate-900">
                    {item.tipo}
                  </p>
                </label>
              ))}
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-2xl font-black text-slate-800">
                Valor
              </label>

              <GastosEmpleadoClient />
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-2xl font-black text-slate-800">
                  Método
                </label>

                <select
                  name="metodo"
                  className="w-full rounded-3xl border p-6 text-2xl font-black"
                >
                  <option value="Efectivo">
                    Efectivo
                  </option>
                  <option value="Nequi">
                    Nequi
                  </option>
                  <option value="Daviplata">
                    Daviplata
                  </option>
                  <option value="Transferencia">
                    Transferencia
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-3 block text-2xl font-black text-slate-800">
                  Responsable
                </label>

                <input
                  name="responsable"
                  placeholder="Empleado"
                  defaultValue="Empleado"
                  className="w-full rounded-3xl border p-6 text-2xl font-black"
                />
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-2xl font-black text-slate-800">
                Descripción
              </label>

              <textarea
                name="descripcion"
                rows={4}
                placeholder="Descripción del gasto..."
                className="textarea-modern text-xl font-bold"
              />
            </div>

            <button
              type="submit"
              className="mt-8 w-full rounded-3xl bg-red-500 p-7 text-3xl font-black text-white hover:bg-red-600"
            >
              Registrar gasto
            </button>
          </form>

          <section className="card p-8">
            <h2 className="text-4xl font-black text-slate-900">
              Resumen de hoy
            </h2>

            <div className="mt-6 rounded-3xl bg-red-50 p-8 text-center">
              <p className="text-xl font-bold text-red-700">
                Total gastos del día
              </p>

              <p className="mt-3 text-6xl font-black text-red-600">
                ${totalGastos.toLocaleString("es-CO")}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {gastos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="rounded-3xl border bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-2xl font-black text-slate-900">
                        {gasto.tipo}
                      </p>

                      <p className="mt-1 text-lg text-slate-500">
                        {gasto.descripcion ||
                          "Sin descripción"}
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-400">
                        {gasto.metodo} ·{" "}
                        {gasto.responsable}
                      </p>
                    </div>

                    <p className="text-2xl font-black text-red-600">
                      -$
                      {gasto.valor.toLocaleString(
                        "es-CO"
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {gastos.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-xl font-bold text-slate-400">
                  No hay gastos registrados hoy.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}