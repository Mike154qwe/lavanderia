import type { Metadata } from "next";
import GastosEmpleadoClient from "./GastosEmpleadoClient";
import { prisma } from "@/lib/prisma";
import { METODOS_PAGO, type MetodoPago } from "@/lib/types";
import FlashMessage from "@/components/FlashMessage";
import EmpleadoHero from "@/components/EmpleadoHero";
import {
  Banknote,
  Droplets,
  Package,
  Pencil,
  Shirt,
  TriangleAlert,
  User,
  Wallet,
} from "lucide-react";

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
  { tipo: "Jabones",        Icon: Droplets },
  { tipo: "Insumos",        Icon: Package },
  { tipo: "Pago empleado",  Icon: User },
  { tipo: "Pago prensista", Icon: Shirt },
  { tipo: "Nómina",         Icon: Banknote },
  { tipo: "Novedad",        Icon: TriangleAlert },
  { tipo: "Otro",           Icon: Pencil },
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
    <div className="page-frame">
      <FlashMessage message={flash ?? error} type={flash ? "success" : "error"} />

      <EmpleadoHero
        kicker="Caja"
        title="Gastos del día"
        subtitle="Jabones, insumos o pagos. El gerente los ve en el cierre."
        icon={<Wallet size={20} strokeWidth={1.75} />}
        tone="amber"
        links={[{ href: "/entradas-salidas-empleado", label: "Lo de hoy" }]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">

        {/* ── Formulario ───────────────────────────────────── */}
        <form action={registrarGastoEmpleado} className="card p-5">
          <h2 className="mb-4 font-bold text-[color:var(--text-1)]">Nuevo gasto</h2>

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
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--radius-well)] figure-well text-red-500">
                  <item.Icon size={18} strokeWidth={1.75} aria-hidden="true" />
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
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Medio de pago</label>
              <select name="metodo" defaultValue="Efectivo" className="input-modern">
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
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
            className="mt-5 w-full rounded-xl bg-red-500 py-4 text-sm font-bold text-white transition hover:bg-red-600 active:scale-[0.99]"
          >
            Registrar gasto
          </button>
        </form>

        {/* ── Resumen del día ──────────────────────────────── */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[color:var(--text-1)]">Resumen de hoy</h2>
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
            <div className="empty-state rounded-[var(--radius-well)] border border-dashed border-[color:var(--border-1)]">
              <span className="mx-auto figure-well h-12 w-12">
                <Wallet size={22} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <p className="empty-state__title">No hay gastos registrados hoy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
