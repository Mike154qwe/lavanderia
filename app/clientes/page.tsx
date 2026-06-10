import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Clientes" };

async function crearCliente(formData: FormData) {
  "use server";
  const nombre    = String(formData.get("nombre") || "").trim();
  const telefono  = String(formData.get("telefono") || "").trim() || null;
  const direccion = String(formData.get("direccion") || "").trim() || null;
  if (!nombre) return;
  try {
    await prisma.cliente.create({ data: { nombre, telefono, direccion } });
  } catch {
    /* telefono duplicado — ignorar silenciosamente */
  }
  revalidatePath("/clientes");
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q      = params.q?.trim() || "";

  const where: any = {};
  if (q) {
    where.OR = [
      { nombre:   { contains: q } },
      { telefono: { contains: q } },
    ];
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { _count: { select: { pedidos: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cliente.count(),
  ]);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const nuevosMes = await prisma.cliente.count({
    where: { createdAt: { gte: inicioMes } },
  });

  return (
    <div className="p-6">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
              Gerente
            </p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">
              Clientes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {total} registrados · {nuevosMes} nuevos este mes
            </p>
          </div>
        </div>

        {/* Búsqueda */}
        <form className="mt-5 flex gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o teléfono…"
            className="input-modern flex-1"
          />
          <button className="btn-primary whitespace-nowrap">Buscar</button>
          {q && (
            <Link href="/clientes" className="btn-dark whitespace-nowrap text-center">
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total clientes"
          value={total}
          color="blue"
          icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        />
        <KpiCard
          label="Nuevos este mes"
          value={nuevosMes}
          color="green"
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM20 8v6M23 11h-6"
        />
        <KpiCard
          label="En búsqueda"
          value={clientes.length}
          color="purple"
          icon="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
        />
      </div>

      {/* ── Formulario nuevo cliente ──────────────────────── */}
      <details className="group card mt-5 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="font-bold text-gray-900">Registrar nuevo cliente</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400 transition duration-200 group-open:rotate-180">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>

        <form action={crearCliente} className="grid gap-4 border-t border-gray-100 px-6 py-5 dark:border-white/[0.07] sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-500">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input name="nombre" placeholder="Ej. María García" required className="input-modern" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-500">
              Teléfono
            </label>
            <input name="telefono" placeholder="Ej. 3001234567" className="input-modern" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-500">
              Dirección
            </label>
            <input name="direccion" placeholder="Ej. Calle 5 # 10-20" className="input-modern" />
          </div>
          <div className="sm:col-span-3">
            <button className="btn-primary">
              Guardar cliente
            </button>
          </div>
        </form>
      </details>

      {/* ── Tabla ────────────────────────────────────────── */}
      <div className="card mt-5 overflow-hidden">
        {clientes.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
            title={q ? `Sin resultados para "${q}"` : "No hay clientes registrados"}
            description={q ? "Prueba con otro nombre o teléfono." : "Los clientes que agregues aparecerán aquí."}
            action={q ? { label: "Ver todos", href: "/clientes", secondary: true } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.07]">
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Cliente
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Teléfono
                  </th>
                  <th className="hidden px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 sm:table-cell">
                    Dirección
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Pedidos
                  </th>
                  <th className="hidden px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 md:table-cell">
                    Desde
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {clientes.map((cliente: any) => {
                  const inicial = cliente.nombre.charAt(0).toUpperCase();
                  const colorIndex = cliente.id % 6;
                  const avatarColors = [
                    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
                    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
                    "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
                    "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
                    "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
                    "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400",
                  ];

                  return (
                    <tr key={cliente.id} className="group transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      {/* Nombre + avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${avatarColors[colorIndex]}`}>
                            {inicial}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{cliente.nombre}</p>
                            <p className="text-xs text-gray-400">ID #{cliente.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="px-6 py-4">
                        {cliente.telefono ? (
                          <a
                            href={`tel:${cliente.telefono}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:bg-white/5 dark:text-gray-300"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.36 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {cliente.telefono}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Dirección */}
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <span className="text-sm text-gray-500">
                          {cliente.direccion || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>
                      </td>

                      {/* Pedidos */}
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          cliente._count.pedidos > 0
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                            : "bg-gray-100 text-gray-400 dark:bg-white/5"
                        }`}>
                          {cliente._count.pedidos}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="hidden px-6 py-4 md:table-cell">
                        <span className="text-sm text-gray-400">
                          {new Date(cliente.createdAt).toLocaleDateString("es-CO")}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/pedidos/nuevo?clienteId=${cliente.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Nuevo pedido
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-componentes ─────────────────────────────────────── */

function KpiCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: "blue" | "green" | "purple"; icon: string;
}) {
  const palette = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];

  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${palette}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
        </svg>
      </div>
      <p className="text-2xl font-black text-gray-900">{value.toLocaleString("es-CO")}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
