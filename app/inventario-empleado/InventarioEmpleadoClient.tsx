"use client";

import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";

type Pago    = { id: number; valor: number; metodo: string };
type Entrega = { id: number; cantidad: number };
type Prenda  = { id: number; tipo: string; servicio: string; descripcion: string | null; cantidad: number; valor: number; entregasParciales: Entrega[] };
type Cliente = { nombre: string; telefono: string | null };
type Pedido  = { id: number; estado: string; total: number; createdAt: string; cliente: Cliente; pagos: Pago[]; prendas: Prenda[] };

const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO:   "bg-blue-100 text-blue-700",
  EN_PROCESO: "bg-yellow-100 text-yellow-700",
  LISTO:      "bg-green-100 text-green-700",
  ENTREGADO:  "bg-gray-100 text-gray-500",
  CANCELADO:  "bg-red-100 text-red-600",
};

const METODOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"];

function fmt(id: number)  { return String(id).padStart(5, "0"); }
function money(n: number) { return `$${n.toLocaleString("es-CO")}`; }
function calc(p: Prenda)  {
  const entregadas = p.entregasParciales.reduce((s, e) => s + e.cantidad, 0);
  return { entregadas, pendientes: p.cantidad - entregadas };
}

export default function InventarioEmpleadoClient({
  q,
  pedidos,
  agregarAbonoEmpleado,
  retirarParcialEmpleado,
  entregarCompletoEmpleado,
}: {
  q: string;
  pedidos: Pedido[];
  agregarAbonoEmpleado:     (f: FormData) => void;
  retirarParcialEmpleado:   (f: FormData) => void;
  entregarCompletoEmpleado: (f: FormData) => void;
}) {
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(
    pedidos.length === 1 ? pedidos[0] : null
  );
  const [prendaRetiro,  setPrendaRetiro]  = useState<number | null>(null);
  const [mostrarAbono,  setMostrarAbono]  = useState(false);

  const pedido  = pedidoActivo;
  const abonado = pedido?.pagos.reduce((s, p) => s + p.valor, 0) ?? 0;
  const saldo   = pedido ? pedido.total - abonado : 0;
  const prendasPendientes = pedido?.prendas.reduce((s, p) => s + calc(p).pendientes, 0) ?? 0;

  function seleccionar(p: Pedido) {
    setPedidoActivo(p);
    setPrendaRetiro(null);
    setMostrarAbono(false);
  }

  function limpiar() {
    setPedidoActivo(null);
    setPrendaRetiro(null);
    setMostrarAbono(false);
  }

  return (
    <div className="p-4 sm:p-6">

      {/* ── Buscador ─────────────────────────────────────── */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Empleado</p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">Buscar pedido</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Número de recibo, nombre o teléfono del cliente.
        </p>

        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Ej: 00045 · María · 310..."
            className="input-modern flex-1 text-base font-semibold"
          />
          <button className="btn-primary px-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>

        {q && (
          <a href="/inventario-empleado" className="mt-3 inline-block text-sm font-semibold text-gray-400 hover:text-gray-600">
            ✕ Limpiar búsqueda
          </a>
        )}
      </div>

      {/* ── Sin resultados ───────────────────────────────── */}
      {q && pedidos.length === 0 && (
        <div className="card mt-4 p-8 text-center">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 font-bold text-gray-500">
            No se encontró ningún pedido activo para "<span className="text-gray-900">{q}</span>".
          </p>
          <p className="mt-1 text-sm text-gray-400">Revisa el número, nombre o teléfono.</p>
        </div>
      )}

      {/* ── Lista de resultados ──────────────────────────── */}
      {!pedido && pedidos.length > 1 && (
        <div className="card mt-4 p-5">
          <h2 className="mb-4 font-black text-gray-900">
            {pedidos.length} resultados — selecciona el pedido
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pedidos.map((item) => {
              const ab  = item.pagos.reduce((s, p) => s + p.valor, 0);
              const sal = item.total - ab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => seleccionar(item)}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-white/[0.07] dark:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-black text-gray-900">#{fmt(item.id)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_BADGE[item.estado] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.estado}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-gray-800">{item.cliente.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {item.cliente.telefono ?? "Sin teléfono"} · {new Date(item.createdAt).toLocaleDateString("es-CO")}
                  </p>
                  <p className={`mt-2 text-sm font-black ${sal > 0 ? "text-red-500" : "text-green-600"}`}>
                    {sal > 0 ? `Saldo: ${money(sal)}` : "✅ Pagado"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detalle del pedido activo ─────────────────────── */}
      {pedido && (
        <div className="mt-4 space-y-4">

          {/* Cabecera */}
          <div className="card overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-white/[0.07]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-2xl font-black text-gray-900">#{fmt(pedido.id)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTADO_BADGE[pedido.estado] ?? "bg-gray-100 text-gray-600"}`}>
                    {pedido.estado}
                  </span>
                </div>
                <p className="mt-1 text-lg font-black text-gray-800">{pedido.cliente.nombre}</p>
                <p className="text-sm text-gray-400">
                  {pedido.cliente.telefono ?? "Sin teléfono"} ·{" "}
                  {new Date(pedido.createdAt).toLocaleDateString("es-CO")}
                </p>
              </div>
              <button
                type="button"
                onClick={limpiar}
                className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/10"
              >
                ← Cambiar
              </button>
            </div>

            {/* Mini-stats */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/[0.07]">
              <div className="p-4 text-center">
                <p className="text-xs font-bold uppercase text-gray-400">Total</p>
                <p className="mt-1 text-lg font-black text-gray-900">{money(pedido.total)}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs font-bold uppercase text-green-600">Pagado</p>
                <p className="mt-1 text-lg font-black text-green-600">{money(abonado)}</p>
              </div>
              <div className="p-4 text-center">
                <p className={`text-xs font-bold uppercase ${saldo > 0 ? "text-red-500" : "text-green-600"}`}>Saldo</p>
                <p className={`mt-1 text-lg font-black ${saldo > 0 ? "text-red-500" : "text-green-600"}`}>
                  {saldo > 0 ? money(saldo) : "✓ Listo"}
                </p>
              </div>
            </div>
          </div>

          {/* Saldo pendiente + abono */}
          {saldo > 0 && (
            <div className="card overflow-hidden border-red-200 dark:border-red-500/20">
              <div className="flex items-center justify-between gap-4 border-b border-red-100 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
                <div>
                  <p className="font-black text-red-600 dark:text-red-400">Saldo pendiente</p>
                  <p className="mt-0.5 text-sm text-red-500 dark:text-red-400">
                    Para entregar todo debes saldar primero.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarAbono((v) => !v)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    mostrarAbono
                      ? "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                      : "bg-brand-500 text-white hover:bg-brand-600"
                  }`}
                >
                  {mostrarAbono ? "Cancelar" : "Registrar abono"}
                </button>
              </div>

              {mostrarAbono && (
                <form action={agregarAbonoEmpleado} className="grid gap-3 p-5 sm:grid-cols-[1fr_160px_auto]">
                  <input type="hidden" name="pedidoId" value={pedido.id} />
                  <MoneyInput name="valor" placeholder={`Saldo: ${money(saldo)}`} />
                  <select name="metodo" className="input-modern">
                    {METODOS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <button className="btn-primary whitespace-nowrap">Confirmar</button>
                </form>
              )}
            </div>
          )}

          {/* Prendas */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black text-gray-900">Prendas del pedido</h2>
              <span className="text-sm font-semibold text-gray-400">
                {prendasPendientes} pendiente{prendasPendientes !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {pedido.prendas.map((prenda) => {
                const { entregadas, pendientes: pend } = calc(prenda);
                const done  = pend === 0;
                const activa = prendaRetiro === prenda.id;

                return (
                  <div
                    key={prenda.id}
                    className={`rounded-xl border p-4 transition ${
                      done
                        ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5"
                        : activa
                        ? "border-brand-300 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/5"
                        : "border-gray-100 bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900">{prenda.tipo}</p>
                        <p className="text-sm text-gray-500">{prenda.servicio}</p>
                        <p className="mt-1 text-sm">
                          <span className="text-gray-400">Recibidas {prenda.cantidad}</span>
                          {" · "}
                          <span className="text-gray-400">Entregadas {entregadas}</span>
                          {" · "}
                          <span className={`font-bold ${done ? "text-green-600" : "text-gray-900"}`}>
                            Pendientes {pend}
                          </span>
                        </p>
                        {prenda.descripcion && (
                          <p className="mt-2 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                            ⚠️ {prenda.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-black text-brand-500">{money(prenda.valor)}</p>
                        {done ? (
                          <p className="mt-2 text-sm font-black text-green-600">✅ Entregada</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPrendaRetiro(activa ? null : prenda.id)}
                            className={`mt-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                              activa
                                ? "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                                : "bg-gray-900 text-white hover:bg-brand-500 dark:bg-white/10 dark:hover:bg-brand-500"
                            }`}
                          >
                            {activa ? "Cancelar" : "Retirar"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Formulario retiro parcial */}
                    {activa && pend > 0 && (
                      <form action={retirarParcialEmpleado} className="mt-4 grid gap-3 border-t border-gray-200 pt-4 dark:border-white/10 sm:grid-cols-2">
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="prendaId" value={prenda.id} />

                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-500">
                            Cantidad (máx. {pend})
                          </label>
                          <input
                            name="cantidad"
                            type="number"
                            min="1"
                            max={pend}
                            defaultValue={pend}
                            required
                            className="input-modern text-lg font-bold"
                          />
                        </div>

                        {saldo > 0 && (
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500">
                              Abono (obligatorio)
                            </label>
                            <MoneyInput name="abono" placeholder="Valor del abono" />
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-500">Método</label>
                          <select name="metodo" className="input-modern">
                            {METODOS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-500">Observación</label>
                          <input name="observacion" placeholder="Opcional" className="input-modern" />
                        </div>

                        <button className="btn-primary sm:col-span-2">
                          ✅ Confirmar retiro — {pend} prenda{pend !== 1 ? "s" : ""}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Entregar todo */}
            {saldo <= 0 && prendasPendientes > 0 && (
              <form action={entregarCompletoEmpleado} className="mt-5">
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <button className="w-full rounded-xl bg-green-500 py-5 text-xl font-black text-white shadow-sm transition hover:bg-green-600 active:scale-[0.99]">
                  📦 Entregar todo el pedido
                </button>
              </form>
            )}

            {saldo > 0 && prendasPendientes > 0 && (
              <p className="mt-4 rounded-xl bg-yellow-50 p-4 text-center text-sm font-bold text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                Salda el pedido arriba antes de entregarlo completo.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
