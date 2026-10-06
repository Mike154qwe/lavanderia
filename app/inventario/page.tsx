import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import MoneyInput from "@/components/MoneyInput";
import { EmptyState } from "@/components/EmptyState";
import FieldIcon from "@/components/FieldIcon";
import EstadoBadge from "@/components/EstadoBadge";
import Pager from "@/components/Pager";
import { money, fmt, fechaDiaMes, fechaHora, diasCalendarioDesde } from "@/lib/format";
import { ESTADOS_PEDIDO, type EstadoPedido, METODOS_PAGO, type MetodoPago } from "@/lib/types";
import BarcodeListener from "./BarcodeListener";
import { PrendaIcon } from "@/components/PrendaIcon";
import { AlertTriangle, ArrowDownToLine, Check, ChevronDown, ChevronRight, CircleCheck, CircleX, ClipboardList, Layers, Phone, Printer, Search, X, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Inventario" };

const PAGE_SIZE = 20;

function diasDesde(fecha: Date) {
  return diasCalendarioDesde(fecha);
}
function diasColor(d: number) {
  if (d <= 2) return "bg-green-50 text-green-700";
  if (d <= 5) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}
function diasLabel(d: number) {
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

function buildUrl(page: number, q: string, estado: string) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (estado && estado !== "TODOS") p.set("estado", estado);
  p.set("page", String(page));
  return `/inventario?${p.toString()}`;
}

/* ── Server actions ──────────────────────────────────────────── */

async function agregarAbono(formData: FormData) {
  "use server";
  const pedidoId = Number(formData.get("pedidoId"));
  const valor    = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo   = String(formData.get("metodo") || "Efectivo") as MetodoPago;
  if (!pedidoId || valor <= 0 || !METODOS_PAGO.includes(metodo)) return;
  await prisma.pago.create({ data: { pedidoId, valor, metodo } });
  revalidatePath("/inventario");
  revalidatePath("/gerente");
  redirect("/inventario?flash=Abono+registrado");
}

async function registrarEntregaParcial(formData: FormData) {
  "use server";
  const pedidoId    = Number(formData.get("pedidoId"));
  const prendaId    = Number(formData.get("prendaId"));
  const cantidad    = Number(formData.get("cantidad"));
  const observacion = String(formData.get("observacion") || "");
  const abono       = Number(String(formData.get("abono") || "0").replace(/\D/g, ""));
  const metodo      = String(formData.get("metodo") || "Efectivo") as MetodoPago;
  if (!pedidoId || !prendaId || cantidad <= 0 || !METODOS_PAGO.includes(metodo)) return;

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { pagos: true, prendas: { include: { entregasParciales: true } } },
  });
  if (!pedido) return;
  const prenda = pedido.prendas.find((p: any) => p.id === prendaId);
  if (!prenda) return;
  const entregadas = prenda.entregasParciales.reduce((s: number, e: any) => s + e.cantidad, 0);
  if (cantidad > prenda.cantidad - entregadas) return;
  const abonado = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  if (pedido.total - abonado > 0 && abono <= 0) return;

  await prisma.$transaction(async (tx) => {
    if (abono > 0) await tx.pago.create({ data: { pedidoId, valor: abono, metodo } });
    await tx.entregaParcial.create({ data: { pedidoId, prendaId, cantidad, observacion: observacion || null } });
    const actualizado = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { prendas: { include: { entregasParciales: true } } },
    });
    if (actualizado) {
      const todoEntregado = actualizado.prendas.every(
        (p) => p.entregasParciales.reduce((s, e) => s + e.cantidad, 0) >= p.cantidad,
      );
      if (todoEntregado) {
        await tx.pedido.update({ where: { id: pedidoId }, data: { estado: "ENTREGADO" } });
        await tx.historialEstado.create({ data: { pedidoId, estado: "ENTREGADO" } });
      }
    }
  });
  revalidatePath("/inventario");
  revalidatePath("/gerente");
  redirect("/inventario?flash=Entrega+registrada");
}

async function cambiarEstado(formData: FormData) {
  "use server";
  const pedidoId    = Number(formData.get("pedidoId"));
  const nuevoEstado = String(formData.get("nuevoEstado")) as EstadoPedido;
  if (!pedidoId || !ESTADOS_PEDIDO.includes(nuevoEstado)) return;
  await prisma.$transaction([
    prisma.pedido.update({ where: { id: pedidoId }, data: { estado: nuevoEstado } }),
    prisma.historialEstado.create({ data: { pedidoId, estado: nuevoEstado } }),
  ]);
  revalidatePath("/inventario");
  revalidatePath("/gerente");
  redirect("/inventario?flash=Estado+actualizado");
}

/* ── Page ───────────────────────────────────────────────────── */

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string; scan?: string }>;
}) {
  const params       = await searchParams;
  const q            = params.q?.trim() || "";
  const estadoFiltro = params.estado || "TODOS";
  const currentPage  = Math.max(Number(params.page || "1"), 1);
  const isScan       = params.scan === "1";

  // En modo escaneo con código específico, mostrar todos los estados
  // (permite encontrar pedidos ya entregados si el cliente vuelve con el recibo)
  const baseWhere: any = (isScan && q)
    ? {}
    : { estado: { notIn: ["ENTREGADO", "CANCELADO"] } };
  if (!isScan && (estadoFiltro === "RECIBIDO" || estadoFiltro === "LISTO")) baseWhere.estado = estadoFiltro;
  if (q) {
    const idNum = Number(q.replace(/^0+/, ""));
    baseWhere.OR = [
      ...(Number.isFinite(idNum) && idNum > 0 ? [{ id: idNum }] : []),
      { cliente: { nombre:   { contains: q } } },
      { cliente: { telefono: { contains: q } } },
    ];
  }

  const needsSaldoFilter = estadoFiltro === "CON_SALDO" || estadoFiltro === "PAGADOS";
  let pedidos: any[] = [];
  let total = 0;

  if (needsSaldoFilter) {
    const todos = await prisma.pedido.findMany({
      where:   baseWhere,
      include: { cliente: true, pagos: true, prendas: { include: { entregasParciales: true } } },
      orderBy: { createdAt: "desc" },
    });
    const filtered = todos.filter((p: any) => {
      const sal = p.total - p.pagos.reduce((s: number, pg: any) => s + pg.valor, 0);
      return estadoFiltro === "CON_SALDO" ? sal > 0 : sal <= 0;
    });
    total   = filtered.length;
    pedidos = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  } else {
    total   = await prisma.pedido.count({ where: baseWhere });
    pedidos = await prisma.pedido.findMany({
      where:   baseWhere,
      include: { cliente: true, pagos: true, prendas: { include: { entregasParciales: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const kpiPrendas = pedidos.reduce(
    (s: number, p: any) =>
      s + p.prendas.reduce((ps: number, pr: any) => {
        const ent = pr.entregasParciales.reduce((es: number, e: any) => es + e.cantidad, 0);
        return ps + Math.max(pr.cantidad - ent, 0);
      }, 0),
    0,
  );
  const kpiSaldo  = pedidos.filter((p: any) => p.total - p.pagos.reduce((s: number, pg: any) => s + pg.valor, 0) > 0).length;
  const kpiListos = pedidos.filter((p: any) => p.estado === "LISTO").length;

  const CHIPS = [
    { value: "TODOS",     label: "Todos",           count: total },
    { value: "RECIBIDO",  label: "Recibidos",        count: null },
    { value: "LISTO",     label: "Listos",           count: null },
    { value: "CON_SALDO", label: "Con saldo",        count: null },
    { value: "PAGADOS",   label: "Pagados",          count: null },
  ];

  return (
    <div className="page-frame page-frame--wide">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="page-kicker text-brand-500">Gerente</p>
            <h1 className="page-title">Inventario en piso</h1>
            <p className="page-subtitle">
              {total} pedido{total !== 1 ? "s" : ""} activo{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BarcodeListener />
            <Link
              href="/pedidos/rapido"
              className="btn-primary gap-2"
            >
              <Zap size={16} strokeWidth={2.25} aria-hidden="true" />
              Pedido rápido
            </Link>
          </div>
        </div>

        {/* Búsqueda */}
        <form className="mt-4 flex flex-col gap-2 sm:flex-row">
          <FieldIcon icon={<Search size={16} strokeWidth={1.75} />} className="min-w-0 flex-1">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por recibo, cliente o teléfono…"
              className="input-modern w-full"
            />
          </FieldIcon>
          {q && (
            <Link href="/inventario" className="btn-dark gap-1 whitespace-nowrap">
              <X size={14} strokeWidth={2.25} aria-hidden="true" />
              Limpiar
            </Link>
          )}
          <button className="btn-primary whitespace-nowrap">Buscar</button>
        </form>

        {/* Chips de estado */}
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((chip) => {
            const active = estadoFiltro === chip.value;
            return (
              <Link
                key={chip.value}
                href={buildUrl(1, q, chip.value)}
                className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  active
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {chip.label}
                {chip.count !== null && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${active ? "bg-white/25 text-white" : "bg-white text-gray-500"}`}>
                    {chip.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={<ClipboardList size={18} strokeWidth={1.75} />} label="Pedidos activos"    value={pedidos.length} color="blue"   />
        <KpiCard icon={<Layers size={18} strokeWidth={1.75} />} label="Prendas pendientes" value={kpiPrendas}     color="purple" />
        <KpiCard icon={<AlertTriangle size={18} strokeWidth={1.75} />} label="Con saldo"          value={kpiSaldo}       color="red"    />
        <KpiCard icon={<CircleCheck size={18} strokeWidth={1.75} />} label="Listos para recoger" value={kpiListos}     color="green"  />
      </div>

      {/* ── Banner de resultado de escaneo ──────────────── */}
      {isScan && q && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold ${
          pedidos.length > 0
            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
            : "bg-red-50 text-red-600 ring-1 ring-red-200"
        }`}>
          {pedidos.length > 0
            ? <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
            : <CircleX size={18} strokeWidth={2} aria-hidden="true" />}
          {pedidos.length > 0
            ? `Recibo #${String(parseInt(q, 10)).padStart(5, "0")} encontrado — ${pedidos[0].cliente.nombre}`
            : `No se encontró el recibo #${String(parseInt(q, 10)).padStart(5, "0")}`}
          <Link href="/inventario" className="ml-auto rounded-xl bg-white/70 px-3 py-1 text-xs font-bold text-gray-500 hover:bg-white">
            Ver todos
          </Link>
        </div>
      )}

      {/* ── Tabla compacta ───────────────────────────────── */}
      <div className="card overflow-hidden">
        {pedidos.length === 0 ? (
          <EmptyState
            icon={<Layers size={22} strokeWidth={1.75} />}
            title={q || estadoFiltro !== "TODOS" ? "Sin resultados" : "No hay pedidos activos"}
            description={q || estadoFiltro !== "TODOS" ? "Prueba con otros filtros." : "Los pedidos que recibas aparecerán aquí."}
            action={q || estadoFiltro !== "TODOS" ? { label: "Ver todos", href: "/inventario", secondary: true } : undefined}
          />
        ) : (
          <div className="divide-y divide-[color:var(--border-1)]">
            <div className="hidden grid-cols-[4.5rem_minmax(10rem,1.5fr)_7.5rem_5.5rem_6.5rem_5.5rem_2.5rem] gap-x-4 bg-[color:var(--surface-2)] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-3)] md:grid">
              <span>Recibo</span>
              <span>Cliente</span>
              <span>Estado</span>
              <span className="text-center">Prendas</span>
              <span className="text-right">Saldo</span>
              <span className="text-center">Días</span>
              <span />
            </div>

            {pedidos.map((pedido: any) => (
              <FilaPedido
                key={pedido.id}
                pedido={pedido}
                agregarAbono={agregarAbono}
                registrarEntregaParcial={registrarEntregaParcial}
                cambiarEstado={cambiarEstado}
                autoOpen={isScan && pedidos.length === 1}
              />
            ))}
          </div>
        )}
      </div>

      <Pager
        page={currentPage}
        totalPages={totalPages}
        hrefFor={(p) => buildUrl(p, q, estadoFiltro)}
        className="card flex items-center justify-between p-4"
      />
    </div>
  );
}

/* ── FilaPedido — fila compacta con detalle expandible ─────── */

function FilaPedido({ pedido, agregarAbono, registrarEntregaParcial, cambiarEstado, autoOpen }: {
  pedido: any;
  agregarAbono: (f: FormData) => void;
  registrarEntregaParcial: (f: FormData) => void;
  cambiarEstado: (f: FormData) => void;
  autoOpen?: boolean;
}) {
  const abonado      = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  const saldo        = pedido.total - abonado;
  const totalPrendas = pedido.prendas.reduce((s: number, p: any) => s + p.cantidad, 0);
  const totalEnt     = pedido.prendas.reduce((s: number, p: any) =>
    s + p.entregasParciales.reduce((es: number, e: any) => es + e.cantidad, 0), 0);
  const dias         = diasDesde(pedido.createdAt);

  return (
    <details className="group" open={autoOpen}>
      {/* ── Fila compacta (siempre visible) ── */}
      <summary className="cursor-pointer list-none transition hover:bg-[color:var(--surface-2)] group-open:bg-brand-50 dark:group-open:bg-brand-500/10">
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 md:hidden">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-brand-500">#{fmt(pedido.id)}</p>
            <p className="truncate text-sm font-bold text-[color:var(--text-1)]">{pedido.cliente.nombre}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <EstadoBadge estado={pedido.estado} />
              {saldo > 0 ? (
                <span className="text-xs font-black text-red-600">{money(saldo)}</span>
              ) : (
                <span className="text-xs font-bold text-green-600">Pagado</span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${diasColor(dias)}`}>
                {diasLabel(dias)}
              </span>
            </div>
          </div>
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            aria-hidden="true"
            className="mt-1 shrink-0 text-[color:var(--text-3)] transition-transform group-open:rotate-180"
          />
        </div>

        <div className="hidden grid-cols-[4.5rem_minmax(10rem,1.5fr)_7.5rem_5.5rem_6.5rem_5.5rem_2.5rem] items-center gap-x-4 px-5 py-4 md:grid">
        <span className="font-mono text-sm font-bold text-brand-500">#{fmt(pedido.id)}</span>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[color:var(--text-1)]">{pedido.cliente.nombre}</p>
          <p className="truncate text-xs text-[color:var(--text-3)]">{pedido.cliente.telefono ?? "—"}</p>
        </div>

        <EstadoBadge estado={pedido.estado} />

        {/* Prendas */}
        <div className="text-center">
          <span className="text-sm font-bold text-gray-700">{totalEnt}/{totalPrendas}</span>
          <div className="mx-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full ${totalEnt === totalPrendas ? "bg-green-500" : "bg-brand-500"}`}
              style={{ width: `${totalPrendas > 0 ? (totalEnt / totalPrendas) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Saldo */}
        <div className="text-right">
          {saldo > 0 ? (
            <span className="text-sm font-black text-red-600">{money(saldo)}</span>
          ) : (
            <span className="text-sm font-bold text-green-600">Pagado</span>
          )}
        </div>

        {/* Días */}
        <div className="text-center">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${diasColor(dias)}`}>
            {diasLabel(dias)}
          </span>
        </div>

        <div className="flex justify-end">
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            aria-hidden="true"
            className="text-[color:var(--text-3)] transition-transform group-open:rotate-180"
          />
        </div>
        </div>
      </summary>

      <div className="border-t border-[color:var(--border-1)] bg-[color:var(--surface-2)]">
        <PedidoCard
          pedido={pedido}
          agregarAbono={agregarAbono}
          registrarEntregaParcial={registrarEntregaParcial}
          cambiarEstado={cambiarEstado}
        />
      </div>
    </details>
  );
}

/* ── PedidoCard ─────────────────────────────────────────────── */

function PedidoCard({ pedido, agregarAbono, registrarEntregaParcial, cambiarEstado }: {
  pedido: any;
  agregarAbono: (f: FormData) => void;
  registrarEntregaParcial: (f: FormData) => void;
  cambiarEstado: (f: FormData) => void;
}) {
  const abonado         = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  const saldo           = pedido.total - abonado;
  const totalPrendas    = pedido.prendas.reduce((s: number, p: any) => s + p.cantidad, 0);
  const totalEntregadas = pedido.prendas.reduce((s: number, p: any) =>
    s + p.entregasParciales.reduce((es: number, e: any) => es + e.cantidad, 0), 0);
  const pendientes      = totalPrendas - totalEntregadas;
  const progresoPct     = totalPrendas > 0 ? Math.round((totalEntregadas / totalPrendas) * 100) : 0;
  const dias            = diasDesde(pedido.createdAt);

  return (
    <div>

      {/* ── Cabecera ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-5">
        <div className="flex items-start gap-3">
          {/* Avatar con inicial */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-base font-bold text-white shadow-sm">
            {pedido.cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/pedidos/${pedido.id}`}
                className="font-bold text-gray-900 transition hover:text-brand-500"
              >
                {pedido.cliente.nombre}
              </Link>
              <EstadoBadge estado={pedido.estado} />
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${diasColor(dias)}`}>
                {diasLabel(dias)}
              </span>
            </div>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[color:var(--text-3)]">
              <Phone size={12} strokeWidth={2} aria-hidden="true" />
              {pedido.cliente.telefono ?? "Sin teléfono"}
              <span className="mx-1.5 opacity-40">·</span>
              Recibo{" "}
              <span className="font-bold text-brand-500">#{fmt(pedido.id)}</span>
              <span className="mx-1.5 opacity-40">·</span>
              {fechaDiaMes(new Date(pedido.createdAt))}
              {" "}
              {fechaHora(new Date(pedido.createdAt))}
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2">
          <Link
            href={`/recibos/${pedido.id}/pdf`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:border-brand-300 hover:text-brand-600"
          >
            <Printer size={13} strokeWidth={2} aria-hidden="true" />
            Recibo
          </Link>
          <Link
            href={`/pedidos/${pedido.id}`}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:border-brand-300 hover:text-brand-600"
          >
            Ver detalle
            <ChevronRight size={13} strokeWidth={2.25} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── Barra de progreso global ── */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${progresoPct === 100 ? "bg-green-500" : "bg-brand-500"}`}
                style={{ width: `${progresoPct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-bold text-gray-500">
              {totalEntregadas}/{totalPrendas} prendas
            </span>
          </div>
          <div className="shrink-0">
            {saldo > 0 ? (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 ring-1 ring-red-200">
                Saldo: {money(saldo)}
              </span>
            ) : (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600 ring-1 ring-green-200">
                Pagado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div className="grid xl:grid-cols-[1fr_300px]">

        {/* Prendas */}
        <div className="border-b border-gray-100 p-5 xl:border-b-0 xl:border-r">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Prendas · {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {pedido.prendas.map((prenda: any) => {
              const ent  = prenda.entregasParciales.reduce((s: number, e: any) => s + e.cantidad, 0);
              const pend = prenda.cantidad - ent;
              const done = pend === 0;
              const pct  = prenda.cantidad > 0 ? Math.round((ent / prenda.cantidad) * 100) : 100;

              return (
                <div
                  key={prenda.id}
                  className={`overflow-hidden rounded-xl border transition ${
                    done
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <PrendaIcon tipo={prenda.tipo} size={20} className="shrink-0 text-gray-600 dark:text-gray-300" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-gray-900 truncate">
                          {prenda.tipo}
                          <span className="ml-1.5 font-normal text-gray-400 text-xs">{prenda.servicio}</span>
                        </p>
                        <span className="shrink-0 text-sm font-black text-brand-500">{money(prenda.valor ?? 0)}</span>
                      </div>
                      {/* Mini barra de progreso */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${done ? "bg-green-500" : "bg-brand-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${done ? "text-green-600" : "text-gray-500"}`}>
                          {done ? (
                            <span className="inline-flex items-center gap-1">
                              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                              Listo
                            </span>
                          ) : `${ent}/${prenda.cantidad}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {prenda.descripcion && (
                    <div className="border-t border-orange-100 bg-orange-50 px-4 py-1.5">
                      <p className="flex items-start gap-1.5 text-xs font-bold text-orange-600">
                        <AlertTriangle size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {prenda.descripcion}
                      </p>
                    </div>
                  )}

                  {prenda.entregasParciales.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                      {prenda.entregasParciales.map((e: any) => (
                        <p key={e.id} className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <ArrowDownToLine size={11} strokeWidth={2} aria-hidden="true" />
                          {e.cantidad} retiradas ·{" "}
                          {fechaDiaMes(new Date(e.createdAt))}
                          {e.observacion ? ` · ${e.observacion}` : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  {pend > 0 && (
                    <details className="group border-t border-gray-100">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-bold text-brand-600 hover:bg-brand-50">
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowDownToLine size={13} strokeWidth={2} aria-hidden="true" />
                          Registrar retiro de esta prenda
                        </span>
                        <ChevronDown size={14} strokeWidth={2} className="transition duration-200 group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <form action={registrarEntregaParcial} className="grid gap-2 bg-gray-50 px-4 pb-4 pt-2 sm:grid-cols-2">
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="prendaId" value={prenda.id} />
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-500">Cantidad (máx. {pend})</label>
                          <input name="cantidad" type="number" min="1" max={pend} defaultValue={pend} required className="input-modern" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-500">Método</label>
                          <select name="metodo" className="input-modern">
                            {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        {saldo > 0 && (
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500">Abono (obligatorio)</label>
                            <MoneyInput name="abono" placeholder="Valor del abono" />
                          </div>
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-500">Observación</label>
                          <input name="observacion" placeholder="Opcional" className="input-modern" />
                        </div>
                        <button className="btn-primary sm:col-span-2">Confirmar retiro</button>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="divide-y divide-gray-100">

          {/* Resumen financiero */}
          <div className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Pagos</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total del pedido</span>
                <span className="font-black text-gray-900">{money(pedido.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Abonado</span>
                <span className="font-black text-green-600">{money(abonado)}</span>
              </div>
              <div className={`mt-2 flex justify-between rounded-xl px-3 py-2.5 ${saldo > 0 ? "bg-red-50 ring-1 ring-red-200" : "bg-green-50 ring-1 ring-green-200"}`}>
                <span className={`font-bold ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                  {saldo > 0 ? "Saldo" : "Pagado"}
                </span>
                <span className={`text-lg font-black ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                  {money(Math.max(saldo, 0))}
                </span>
              </div>
            </div>

            {pedido.pagos.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {pedido.pagos.map((pago: any) => (
                  <div key={pago.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-400">
                      {pago.metodo} · {fechaDiaMes(new Date(pago.createdAt))}
                    </p>
                    <p className="text-xs font-black text-brand-500">{money(pago.valor)}</p>
                  </div>
                ))}
              </div>
            )}

            {saldo > 0 && (
              <form action={agregarAbono} className="mt-3 grid gap-2">
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <MoneyInput name="valor" placeholder={`Abono — saldo: ${money(saldo)}`} />
                <select name="metodo" className="input-modern">
                  {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
                </select>
                <button className="btn-primary">Registrar abono</button>
              </form>
            )}
          </div>

          {/* Cambiar estado */}
          <div className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Estado</p>
            <div className="space-y-2">
              {pedido.estado === "RECIBIDO" && (
                <EstadoBtn pedidoId={pedido.id} nuevoEstado="LISTO" label="Marcar como LISTO" color="green" action={cambiarEstado} />
              )}
              {pedido.estado === "LISTO" && saldo <= 0 && (
                <EstadoBtn pedidoId={pedido.id} nuevoEstado="ENTREGADO" label="Entregar pedido completo" color="brand" action={cambiarEstado} />
              )}
              {pedido.estado === "LISTO" && saldo > 0 && (
                <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                  Hay saldo pendiente. Registra el abono para poder entregar.
                </p>
              )}
              <EstadoBtn pedidoId={pedido.id} nuevoEstado="CANCELADO" label="Cancelar pedido" color="red" action={cambiarEstado} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componentes ─────────────────────────────────────────── */

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number;
  color: "blue" | "purple" | "red" | "green";
}) {
  const ring: Record<string, string> = {
    blue:   "figure-well--indigo",
    purple: "text-violet-700",
    red:    "bg-red-50 text-red-600",
    green:  "figure-well--aqua",
  };
  const num: Record<string, string> = {
    blue: "text-blue-700", purple: "text-purple-700", red: "text-red-600", green: "text-green-700",
  };
  return (
    <div className="card p-5">
      <div className={`mb-3 figure-well h-10 w-10 ${ring[color]}`}>
        {icon}
      </div>
      <p className={`text-3xl font-black ${num[color]}`}>{value}</p>
      <p className="mt-0.5 text-xs font-bold text-[color:var(--text-2)]">{label}</p>
    </div>
  );
}

function EstadoBtn({ pedidoId, nuevoEstado, label, color, action }: {
  pedidoId: number; nuevoEstado: string; label: string;
  color: "green" | "brand" | "red"; action: (f: FormData) => void;
}) {
  const cls = {
    green: "bg-green-500 hover:bg-green-600 text-white",
    brand: "bg-brand-500 hover:bg-brand-600 text-white",
    red:   "bg-red-50 hover:bg-red-100 text-red-600",
  }[color];
  return (
    <form action={action}>
      <input type="hidden" name="pedidoId"    value={pedidoId} />
      <input type="hidden" name="nuevoEstado" value={nuevoEstado} />
      <button className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition ${cls}`}>
        {label}
      </button>
    </form>
  );
}
