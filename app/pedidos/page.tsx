import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PAGE_SIZE = 25;

const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO:   "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  EN_PROCESO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  LISTO:      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  ENTREGADO:  "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
  CANCELADO:  "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
};

function money(n: number) { return `$${n.toLocaleString("es-CO")}`; }
function fmt(id: number)  { return String(id).padStart(5, "0"); }

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}) {
  const params      = await searchParams;
  const q           = params.q?.trim() || "";
  const estadoFiltro = params.estado || "TODOS";
  const page        = Math.max(Number(params.page || "1"), 1);

  const where: any = {};
  if (estadoFiltro !== "TODOS") where.estado = estadoFiltro;
  if (q) {
    const idNum = Number(q.replace(/^0+/, ""));
    where.OR = [
      ...(Number.isFinite(idNum) && idNum > 0 ? [{ id: idNum }] : []),
      { cliente: { nombre:   { contains: q } } },
      { cliente: { telefono: { contains: q } } },
    ];
  }

  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const [pedidos, total, kpiHoy, kpiActivos] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: { cliente: true, pagos: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.pedido.count({ where }),
    prisma.pedido.count({ where: { createdAt: { gte: inicio } } }),
    prisma.pedido.count({ where: { estado: { notIn: ["ENTREGADO", "CANCELADO"] } } }),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  function buildUrl(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (estadoFiltro !== "TODOS") sp.set("estado", estadoFiltro);
    sp.set("page", String(p));
    return `/pedidos?${sp.toString()}`;
  }

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
              Pedidos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {total} pedido{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/pedidos/nuevo"
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo pedido
          </Link>
        </div>

        {/* Filtros */}
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px_auto_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por recibo, cliente o teléfono…"
            className="input-modern"
          />
          <select name="estado" defaultValue={estadoFiltro} className="input-modern">
            <option value="TODOS">Todos los estados</option>
            <option value="RECIBIDO">Recibidos</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="LISTO">Listos</option>
            <option value="ENTREGADO">Entregados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
          <button className="btn-primary whitespace-nowrap">Filtrar</button>
          {(q || estadoFiltro !== "TODOS") && (
            <Link href="/pedidos" className="btn-dark whitespace-nowrap text-center">
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Ingresados hoy"
          value={kpiHoy}
          color="blue"
          icon="M12 5v14M5 12h14"
        />
        <KpiCard
          label="En piso (activos)"
          value={kpiActivos}
          color="yellow"
          icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
        />
        <KpiCard
          label="Total en filtro"
          value={total}
          color="purple"
          icon="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
        />
      </div>

      {/* ── Tabla ────────────────────────────────────────── */}
      <div className="card mt-5 overflow-hidden">
        {pedidos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-3 font-semibold text-gray-500">
              No se encontraron pedidos.
            </p>
            <Link href="/pedidos/nuevo" className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
              Crear primer pedido
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/[0.07]">
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                      Recibo
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                      Cliente
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                      Estado
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                      Total
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                      Saldo
                    </th>
                    <th className="hidden px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400 md:table-cell">
                      Fecha
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {pedidos.map((pedido: any) => {
                    const abonado = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
                    const saldo   = pedido.total - abonado;

                    return (
                      <tr key={pedido.id} className="group transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        {/* ID */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="font-mono text-sm font-black text-brand-500 hover:underline"
                          >
                            #{fmt(pedido.id)}
                          </Link>
                        </td>

                        {/* Cliente */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{pedido.cliente.nombre}</p>
                          {pedido.cliente.telefono && (
                            <p className="text-xs text-gray-400">{pedido.cliente.telefono}</p>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTADO_BADGE[pedido.estado] ?? "bg-gray-100 text-gray-500"}`}>
                            {pedido.estado}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 font-bold text-gray-900">
                          {money(pedido.total)}
                        </td>

                        {/* Saldo */}
                        <td className="px-5 py-4">
                          {saldo > 0 ? (
                            <span className="font-bold text-red-500">{money(saldo)}</span>
                          ) : (
                            <span className="font-semibold text-green-600 dark:text-green-400">✓ Pagado</span>
                          )}
                        </td>

                        {/* Fecha */}
                        <td className="hidden px-5 py-4 text-gray-400 md:table-cell">
                          {new Date(pedido.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                          })}
                        </td>

                        {/* Acción */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:text-gray-400"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.07]">
                <Link
                  href={buildUrl(Math.max(page - 1, 1))}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    page === 1
                      ? "pointer-events-none text-gray-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  }`}
                >
                  ← Anterior
                </Link>
                <span className="text-sm font-semibold text-gray-400">
                  Página {page} / {totalPages}
                </span>
                <Link
                  href={buildUrl(Math.min(page + 1, totalPages))}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    page >= totalPages
                      ? "pointer-events-none text-gray-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  }`}
                >
                  Siguiente →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: "blue" | "yellow" | "purple"; icon: string;
}) {
  const palette = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
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
