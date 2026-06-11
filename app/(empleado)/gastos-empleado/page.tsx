import type { Metadata } from "next";
import GastosEmpleadoClient from "./GastosEmpleadoClient";
import { prisma } from "@/lib/prisma";
import { METODOS_PAGO, type MetodoPago } from "@/lib/types";
import FlashMessage from "@/components/FlashMessage";

export const metadata: Metadata = { title: "Gastos del día" };
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/\D/g, ""));
}

async function registrarGastoEmpleado(formData: FormData) {
  "use server";
  const tipo        = String(formData.get("tipo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const valor       = parseMoney(formData.get("valor"));
  const metodo      = String(formData.get("metodo") || "Efectivo") as MetodoPago;
  const responsable = String(formData.get("responsable") || "Empleado").trim();
  if (!tipo) redirect(`/gastos-empleado?error=${encodeURIComponent("Selecciona el tipo de gasto")}`);
  if (valor <= 0) redirect(`/gastos-empleado?error=${encodeURIComponent("El valor debe ser mayor a 0")}`);
  if (!METODOS_PAGO.includes(metodo)) return;
  await prisma.gastoCaja.create({
    data: { tipo, descripcion: descripcion || null, valor, metodo, responsable },
  });
  revalidatePath("/gastos-empleado");
  revalidatePath("/gerente");
  redirect("/gastos-empleado?flash=Gasto+registrado");
}

const TIPOS = [
  { tipo: "Jabones",        icon: "M9.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4.5M12 12v9M8 12h8" },
  { tipo: "Insumos",        icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" },
  { tipo: "Pago empleado",  icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { tipo: "Pago prensista", icon: "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" },
  { tipo: "Nómina",         icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { tipo: "Novedad",        icon: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" },
  { tipo: "Otro",           icon: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" },
];

export default async function GastosEmpleadoPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; error?: string }>;
}) {
  const { flash, error } = await searchParams;
  const hoy   = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const fin    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

  const gastos = await prisma.gastoCaja.findMany({
    where: { createdAt: { gte: inicio, lt: fin } },
    orderBy: { createdAt: "desc" },
  });

  const totalGastos = gastos.reduce((s: number, g: any) => s + g.valor, 0);

  return (
    <div className="p-4 sm:p-6">
      <FlashMessage message={flash ?? error} type={flash ? "success" : "error"} />

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-red-500">Empleado</p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">Gastos del día</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registra gastos para que aparezcan en el panel del gerente.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">

        {/* ── Formulario ───────────────────────────────────── */}
        <form action={registrarGastoEmpleado} className="card p-5">
          <h2 className="mb-4 font-black text-gray-900">Nuevo gasto</h2>

          {/* Tipos (radio) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3">
            {TIPOS.map((item) => (
              <label
                key={item.tipo}
                className="cursor-pointer rounded-xl border border-gray-100 bg-gray-50 p-3 text-center transition hover:border-red-300 hover:bg-red-50 has-[:checked]:border-red-400 has-[:checked]:bg-red-50 has-[:checked]:ring-2 has-[:checked]:ring-red-200 dark:border-white/[0.07] dark:bg-white/[0.02] dark:has-[:checked]:border-red-500/50 dark:has-[:checked]:bg-red-500/10"
              >
                <input
                  type="radio"
                  name="tipo"
                  value={item.tipo}
                  required
                  className="sr-only"
                />
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500">
                    {item.icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.tipo}</p>
              </label>
            ))}
          </div>

          {/* Valor */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-gray-500">Valor</label>
            <GastosEmpleadoClient />
          </div>

          {/* Método + Responsable */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Método</label>
              <select name="metodo" className="input-modern">
                <option value="Efectivo">Efectivo</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Responsable</label>
              <input
                name="responsable"
                placeholder="Empleado"
                defaultValue="Empleado"
                className="input-modern"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-gray-500">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              placeholder="Descripción del gasto…"
              className="textarea-modern"
            />
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-red-500 py-4 text-sm font-black text-white transition hover:bg-red-600 active:scale-[0.99]"
          >
            Registrar gasto
          </button>
        </form>

        {/* ── Resumen del día ──────────────────────────────── */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Resumen de hoy</h2>
            <span className="font-black text-red-500">
              -{`$${totalGastos.toLocaleString("es-CO")}`}
            </span>
          </div>

          {gastos.length > 0 ? (
            <div className="space-y-3">
              {gastos.map((gasto: any) => (
                <div key={gasto.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/[0.07] dark:bg-white/[0.02]">
                  <div>
                    <p className="font-bold text-gray-900">{gasto.tipo}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {gasto.descripcion || "Sin descripción"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {gasto.metodo} · {gasto.responsable} ·{" "}
                      {gasto.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className="shrink-0 font-black text-red-500">
                    -${gasto.valor.toLocaleString("es-CO")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-white/10">
              <p className="text-3xl">💸</p>
              <p className="mt-2 text-sm font-semibold text-gray-400">
                No hay gastos registrados hoy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
