import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Layers, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import FieldIcon from "@/components/FieldIcon";
import EstadoBadge from "@/components/EstadoBadge";
import Pager from "@/components/Pager";
import { money, fmt, fechaCorta, inicioDia } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos" };

const PAGE_SIZE = 25;

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

  const inicio = inicioDia(new Date());

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
    <div className="page-frame page-frame--wide">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="page-kicker text-brand-500">
              Gerente
            </p>
            <h1 className="page-title">
              Pedidos
            </h1>
            <p className="page-subtitle">
              {total} pedido{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/pedidos/nuevo"
            className="btn-primary gap-2"
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            Nuevo pedido
          </Link>
        </div>

        {/* Filtros */}
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px_auto_auto]">
          <FieldIcon icon={<Search size={16} strokeWidth={1.75} />} className="min-w-0">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por recibo, cliente o teléfono…"
              className="input-modern w-full"
            />
          </FieldIcon>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Ingresados hoy"
          value={kpiHoy}
          color="blue"
          icon={<Plus size={18} strokeWidth={1.75} />}
        />
        <KpiCard
          label="En piso (activos)"
          value={kpiActivos}
          color="yellow"
          icon={<Layers size={18} strokeWidth={1.75} />}
        />
        <KpiCard
          label="Total en filtro"
          value={total}
          color="purple"
          icon={<ClipboardList size={18} strokeWidth={1.75} />}
        />
      </div>

      {/* ── Tabla ────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {pedidos.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={22} strokeWidth={1.75} />}
            title={q || estadoFiltro !== "TODOS" ? "Sin resultados" : "No hay pedidos todavía"}
            description={q || estadoFiltro !== "TODOS" ? "Intenta con otros filtros o borra la búsqueda." : "Crea el primer pedido para empezar a gestionar el inventario."}
            action={
              q || estadoFiltro !== "TODOS"
                ? { label: "Ver todos", href: "/pedidos", secondary: true }
                : { label: "Crear pedido", href: "/pedidos/nuevo" }
            }
          />
        ) : (
          <>
            <div className="divide-y divide-[color:var(--border-1)] md:hidden">
              {pedidos.map((pedido: any) => {
                const abonado = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
                const saldo   = pedido.total - abonado;
                return (
                  <Link
                    key={pedido.id}
                    href={`/pedidos/${pedido.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-3.5 transition hover:bg-[color:var(--surface-2)]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-brand-500">#{fmt(pedido.id)}</p>
                      <p className="truncate font-semibold text-[color:var(--text-1)]">{pedido.cliente.nombre}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <EstadoBadge estado={pedido.estado} />
                        <span className="text-xs font-bold text-[color:var(--text-3)]">{money(pedido.total)}</span>
                        {saldo > 0 ? (
                          <span className="text-xs font-bold text-red-500">{money(saldo)}</span>
                        ) : (
                          <span className="text-xs font-semibold text-green-600">Pagado</span>
                        )}
                      </div>
                    </div>
                    <span className="mt-1 text-xs font-semibold text-[color:var(--text-3)]">
                      {fechaCorta(new Date(pedido.createdAt))}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-1)]">
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Recibo
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Cliente
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Estado
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Total
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Saldo
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Fecha
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {pedidos.map((pedido: any) => {
                    const abonado = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
                    const saldo   = pedido.total - abonado;

                    return (
                      <tr key={pedido.id} className="group transition hover:bg-[color:var(--surface-2)]">
                        <td className="px-5 py-4">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="font-mono text-sm font-bold text-brand-500 hover:underline"
                          >
                            #{fmt(pedido.id)}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[color:var(--text-1)]">{pedido.cliente.nombre}</p>
                          {pedido.cliente.telefono && (
                            <p className="text-xs text-[color:var(--text-3)]">{pedido.cliente.telefono}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <EstadoBadge estado={pedido.estado} />
                        </td>
                        <td className="px-5 py-4 font-bold text-[color:var(--text-1)]">
                          {money(pedido.total)}
                        </td>
                        <td className="px-5 py-4">
                          {saldo > 0 ? (
                            <span className="font-bold text-red-500">{money(saldo)}</span>
                          ) : (
                            <span className="font-semibold text-green-600 dark:text-green-400">Pagado</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-[color:var(--text-3)]">
                          {fechaCorta(new Date(pedido.createdAt))}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-[color:var(--border-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-2)] transition hover:border-brand-300 hover:text-brand-600"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pager page={page} totalPages={totalPages} hrefFor={buildUrl} />
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: "blue" | "yellow" | "purple"; icon: React.ReactNode;
}) {
  const palette = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];

  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-well)] ${palette}`}
        style={{ boxShadow: "inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent)" }}>
        {icon}
      </div>
      <p className="text-2xl font-black text-[color:var(--text-1)]">{value.toLocaleString("es-CO")}</p>
      <p className="mt-0.5 text-sm font-medium text-[color:var(--text-3)]">{label}</p>
    </div>
  );
}
