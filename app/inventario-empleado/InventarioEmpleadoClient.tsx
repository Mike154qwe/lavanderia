"use client";

import { useState } from "react";

type Pago        = { id: number; valor: number; metodo: string };
type Entrega     = { id: number; cantidad: number };
type Prenda      = { id: number; tipo: string; servicio: string; descripcion: string | null; cantidad: number; valor: number; entregasParciales: Entrega[] };
type Cliente     = { nombre: string; telefono: string | null };
type Pedido      = { id: number; estado: string; total: number; createdAt: string; cliente: Cliente; pagos: Pago[]; prendas: Prenda[] };

const ESTADO_COLOR: Record<string, string> = {
  RECIBIDO:   "bg-blue-100 text-blue-700",
  EN_PROCESO: "bg-yellow-100 text-yellow-700",
  LISTO:      "bg-green-100 text-green-700",
  ENTREGADO:  "bg-slate-100 text-slate-500",
  CANCELADO:  "bg-red-100 text-red-600",
};

const METODOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"];

function fmt(id: number)   { return String(id).padStart(5, "0"); }
function money(n: number)  { return `$${n.toLocaleString("es-CO")}`; }
function pendientes(p: Prenda) {
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
  agregarAbonoEmpleado:      (f: FormData) => void;
  retirarParcialEmpleado:    (f: FormData) => void;
  entregarCompletoEmpleado:  (f: FormData) => void;
}) {
  const [pedidoActivo,   setPedidoActivo]   = useState<Pedido | null>(pedidos.length === 1 ? pedidos[0] : null);
  const [prendaRetiro,   setPrendaRetiro]   = useState<number | null>(null);
  const [mostrarAbono,   setMostrarAbono]   = useState(false);

  const pedido  = pedidoActivo;
  const abonado = pedido?.pagos.reduce((s, p) => s + p.valor, 0) ?? 0;
  const saldo   = pedido ? pedido.total - abonado : 0;
  const pPendientes = pedido?.prendas.reduce((s, p) => s + pendientes(p).pendientes, 0) ?? 0;

  function seleccionarPedido(p: Pedido) {
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
    <main className="min-h-screen bg-slate-100">
      <section className="p-6">

        {/* ── Buscador ───────────────────────────────────────── */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-base font-black uppercase tracking-widest text-teal-600">
            Inventario
          </p>
          <h1 className="mt-1 text-4xl font-black text-slate-900">
            Buscar pedido
          </h1>
          <p className="mt-2 text-lg text-slate-500">
            Escribe el número de recibo, nombre o teléfono del cliente.
          </p>

          <form className="mt-6 flex gap-3">
            <input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Ej: 00045 · María · 310..."
              className="flex-1 rounded-2xl border-2 border-slate-200 p-5 text-2xl font-bold focus:border-teal-400 focus:outline-none"
            />
            <button className="rounded-2xl bg-teal-500 px-7 py-5 text-2xl font-black text-white hover:bg-teal-600">
              🔎
            </button>
          </form>

          {q && (
            <a
              href="/inventario-empleado"
              className="mt-4 inline-block rounded-xl bg-slate-100 px-5 py-2 text-base font-bold text-slate-600 hover:bg-slate-200"
            >
              ✕ Limpiar búsqueda
            </a>
          )}
        </div>

        {/* ── Sin resultados ─────────────────────────────────── */}
        {q && pedidos.length === 0 && (
          <div className="mt-6 rounded-3xl bg-red-50 p-8 text-center">
            <p className="text-3xl font-black text-red-600">
              No se encontró ningún pedido
            </p>
            <p className="mt-2 text-lg text-slate-500">
              Revisa el número, nombre o teléfono.
            </p>
          </div>
        )}

        {/* ── Lista de resultados (más de 1) ─────────────────── */}
        {!pedido && pedidos.length > 1 && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Selecciona el pedido correcto
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {pedidos.map((item) => {
                const ab  = item.pagos.reduce((s, p) => s + p.valor, 0);
                const sal = item.total - ab;
                const fecha = new Date(item.createdAt).toLocaleDateString("es-CO");

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => seleccionarPedido(item)}
                    className="rounded-3xl border-2 border-slate-100 bg-slate-50 p-6 text-left transition hover:border-teal-400 hover:bg-teal-50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-black text-slate-900">
                        #{fmt(item.id)}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${ESTADO_COLOR[item.estado] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.estado}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-slate-800">
                      {item.cliente.nombre}
                    </p>
                    <p className="text-base text-slate-500">
                      {item.cliente.telefono ?? "Sin teléfono"} · {fecha}
                    </p>
                    <p className={`mt-3 text-lg font-black ${sal > 0 ? "text-red-600" : "text-green-600"}`}>
                      {sal > 0 ? `Saldo: ${money(sal)}` : "✅ Pagado"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Detalle del pedido activo ──────────────────────── */}
        {pedido && (
          <div className="mt-6 space-y-5">

            {/* Cabecera */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-black text-slate-900">
                      #{fmt(pedido.id)}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${ESTADO_COLOR[pedido.estado] ?? "bg-gray-100 text-gray-600"}`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-800">
                    {pedido.cliente.nombre}
                  </p>
                  <p className="text-lg text-slate-500">
                    {pedido.cliente.telefono ?? "Sin teléfono"} ·{" "}
                    {new Date(pedido.createdAt).toLocaleDateString("es-CO")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={limpiar}
                  className="shrink-0 rounded-2xl bg-slate-100 px-5 py-3 text-base font-black text-slate-600 hover:bg-slate-200"
                >
                  ← Cambiar
                </button>
              </div>

              {/* Resumen financiero */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-slate-400">Total</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{money(pedido.total)}</p>
                </div>
                <div className="rounded-2xl bg-green-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-green-600">Pagado</p>
                  <p className="mt-1 text-2xl font-black text-green-700">{money(abonado)}</p>
                </div>
                <div className={`rounded-2xl p-4 text-center ${saldo > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <p className={`text-xs font-bold uppercase ${saldo > 0 ? "text-red-500" : "text-green-600"}`}>Saldo</p>
                  <p className={`mt-1 text-2xl font-black ${saldo > 0 ? "text-red-600" : "text-green-700"}`}>{money(saldo)}</p>
                </div>
              </div>
            </div>

            {/* ── Registrar abono ─────────────────────────────── */}
            {saldo > 0 && (
              <div className="rounded-3xl border-2 border-red-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-red-600">
                      💳 Hay saldo pendiente
                    </h2>
                    <p className="mt-1 text-base text-slate-500">
                      Para entregar todo debes saldar el pedido.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarAbono((v) => !v)}
                    className="rounded-2xl bg-teal-500 px-6 py-3 text-lg font-black text-white hover:bg-teal-600"
                  >
                    {mostrarAbono ? "Cancelar" : "Registrar abono"}
                  </button>
                </div>

                {mostrarAbono && (
                  <form action={agregarAbonoEmpleado} className="mt-5 grid gap-4 sm:grid-cols-3">
                    <input type="hidden" name="pedidoId" value={pedido.id} />

                    <input
                      name="valor"
                      type="number"
                      min="1"
                      required
                      placeholder="Valor del abono"
                      className="rounded-2xl border-2 border-slate-200 p-5 text-2xl font-bold focus:border-teal-400 focus:outline-none"
                    />

                    <select
                      name="metodo"
                      className="rounded-2xl border-2 border-slate-200 p-5 text-xl font-bold focus:border-teal-400 focus:outline-none"
                    >
                      {METODOS.map((m) => <option key={m}>{m}</option>)}
                    </select>

                    <button className="rounded-2xl bg-teal-500 p-5 text-xl font-black text-white hover:bg-teal-600">
                      ✅ Confirmar abono
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Prendas ─────────────────────────────────────── */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900">
                Prendas del pedido
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Toca "Retirar" en la prenda que entregues.
              </p>

              <div className="mt-5 space-y-4">
                {pedido.prendas.map((prenda) => {
                  const { entregadas, pendientes: pend } = pendientes(prenda);
                  const yaEntregada = pend === 0;
                  const activa = prendaRetiro === prenda.id;

                  return (
                    <div
                      key={prenda.id}
                      className={`rounded-3xl border-2 p-5 transition ${
                        yaEntregada
                          ? "border-green-200 bg-green-50"
                          : activa
                          ? "border-teal-400 bg-teal-50"
                          : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      {/* Info de la prenda */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-2xl font-black text-slate-900">
                            {prenda.tipo}
                          </p>
                          <p className="text-lg font-semibold text-slate-600">
                            {prenda.servicio}
                          </p>
                          <p className="mt-1 text-base text-slate-500">
                            Recibidas: {prenda.cantidad} · Entregadas: {entregadas} · <span className={pend > 0 ? "font-black text-slate-800" : "text-green-600"}>Pendientes: {pend}</span>
                          </p>
                          {prenda.descripcion && (
                            <p className="mt-2 rounded-xl bg-orange-50 px-4 py-2 text-base font-bold text-orange-700">
                              ⚠️ {prenda.descripcion}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black text-teal-600">
                            {money(prenda.valor)}
                          </p>
                          {yaEntregada ? (
                            <p className="mt-2 text-base font-black text-green-600">
                              ✅ Entregada
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPrendaRetiro(activa ? null : prenda.id)
                              }
                              className={`mt-2 rounded-xl px-5 py-2 text-base font-black transition ${
                                activa
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-slate-900 text-white hover:bg-slate-700"
                              }`}
                            >
                              {activa ? "Cancelar" : "Retirar"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Formulario de retiro parcial */}
                      {activa && pend > 0 && (
                        <form
                          action={retirarParcialEmpleado}
                          className="mt-5 grid gap-4 sm:grid-cols-2"
                        >
                          <input type="hidden" name="pedidoId"  value={pedido.id} />
                          <input type="hidden" name="prendaId"  value={prenda.id} />

                          <div>
                            <label className="mb-1 block text-sm font-bold text-slate-600">
                              Cantidad (máx. {pend})
                            </label>
                            <input
                              name="cantidad"
                              type="number"
                              min="1"
                              max={pend}
                              defaultValue={pend}
                              required
                              className="w-full rounded-2xl border-2 border-slate-200 p-4 text-2xl font-bold focus:border-teal-400 focus:outline-none"
                            />
                          </div>

                          {saldo > 0 && (
                            <div>
                              <label className="mb-1 block text-sm font-bold text-slate-600">
                                Abono (obligatorio con saldo)
                              </label>
                              <input
                                name="abono"
                                type="number"
                                min="1"
                                required
                                placeholder="Valor abono"
                                className="w-full rounded-2xl border-2 border-slate-200 p-4 text-2xl font-bold focus:border-teal-400 focus:outline-none"
                              />
                            </div>
                          )}

                          <div>
                            <label className="mb-1 block text-sm font-bold text-slate-600">
                              Método de pago
                            </label>
                            <select
                              name="metodo"
                              className="w-full rounded-2xl border-2 border-slate-200 p-4 text-xl font-bold focus:border-teal-400 focus:outline-none"
                            >
                              {METODOS.map((m) => <option key={m}>{m}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-bold text-slate-600">
                              Observación
                            </label>
                            <input
                              name="observacion"
                              placeholder="Opcional"
                              className="w-full rounded-2xl border-2 border-slate-200 p-4 text-xl font-bold focus:border-teal-400 focus:outline-none"
                            />
                          </div>

                          <button className="rounded-2xl bg-teal-500 p-5 text-xl font-black text-white hover:bg-teal-600 sm:col-span-2">
                            ✅ Confirmar retiro de {pend} prenda{pend !== 1 ? "s" : ""}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botón entregar todo */}
              {saldo <= 0 && pPendientes > 0 && (
                <form action={entregarCompletoEmpleado} className="mt-6">
                  <input type="hidden" name="pedidoId" value={pedido.id} />
                  <button className="w-full rounded-3xl bg-teal-500 py-7 text-3xl font-black text-white shadow-lg transition hover:bg-teal-600 active:scale-95">
                    ✅ Entregar todo el pedido
                  </button>
                </form>
              )}

              {saldo > 0 && pPendientes > 0 && (
                <p className="mt-5 rounded-2xl bg-yellow-50 p-4 text-center text-lg font-bold text-yellow-700">
                  Para entregar todo debes saldar el pedido primero.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
