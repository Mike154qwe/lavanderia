"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState } from "react";

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function pendientePrenda(prenda: any) {
  const entregadas = prenda.entregasParciales.reduce(
    (sum: number, entrega: any) => sum + entrega.cantidad,
    0
  );

  return {
    entregadas,
    pendientes: prenda.cantidad - entregadas,
  };
}

export default function InventarioEmpleadoClient({
  q,
  pedidos,
  agregarAbonoEmpleado,
  retirarParcialEmpleado,
  entregarCompletoEmpleado,
}: {
  q: string;
  pedidos: any[];
  agregarAbonoEmpleado: (formData: FormData) => void;
  retirarParcialEmpleado: (formData: FormData) => void;
  entregarCompletoEmpleado: (formData: FormData) => void;
}) {
  const [pedidoActivo, setPedidoActivo] = useState<any | null>(
    pedidos.length === 1 ? pedidos[0] : null
  );

  const pedido = pedidoActivo;

  const abonado =
    pedido?.pagos.reduce((sum: number, pago: any) => sum + pago.valor, 0) || 0;

  const saldo = pedido ? pedido.total - abonado : 0;

  const prendasPendientes =
    pedido?.prendas.reduce((sum: number, prenda: any) => {
      const { pendientes } = pendientePrenda(prenda);
      return sum + pendientes;
    }, 0) || 0;

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <section className="ml-72 p-8">
        <div className="card p-8">
          <p className="text-lg font-black text-teal-600">
            Inventario empleado
          </p>

          <h1 className="mt-2 text-5xl font-black text-slate-900">
            Buscar pedido
          </h1>

          <p className="mt-3 text-xl text-slate-500">
            Escribe número de recibo, nombre o teléfono. No se muestra todo el
            inventario para evitar confusión.
          </p>

          <form className="mt-8 grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Ej: 00045, María, 310..."
              className="w-full rounded-3xl border p-6 text-3xl font-black"
            />

            <button className="rounded-3xl bg-teal-500 px-8 py-6 text-2xl font-black text-white hover:bg-teal-600">
              🔎 Buscar
            </button>
          </form>

          <div className="mt-5 flex gap-3">
            <Link
              href="/pedidos/rapido"
              className="rounded-3xl bg-slate-900 px-6 py-4 text-xl font-black text-white"
            >
              ➕ Nuevo pedido
            </Link>

            <Link
              href="/inventario-empleado"
              className="rounded-3xl bg-slate-200 px-6 py-4 text-xl font-black text-slate-700"
            >
              Limpiar
            </Link>
          </div>
        </div>

        {q && pedidos.length === 0 && (
          <div className="card mt-8 p-10 text-center">
            <p className="text-4xl font-black text-red-600">
              No se encontró el pedido
            </p>

            <p className="mt-3 text-xl text-slate-500">
              Revisa el número, nombre o teléfono.
            </p>
          </div>
        )}

        {!pedido && pedidos.length > 1 && (
          <div className="card mt-8 p-8">
            <h2 className="text-4xl font-black text-slate-900">
              Selecciona el pedido correcto
            </h2>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {pedidos.map((item) => {
                const ab = item.pagos.reduce(
                  (sum: number, pago: any) => sum + pago.valor,
                  0
                );

                const sal = item.total - ab;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPedidoActivo(item)}
                    className="rounded-3xl border bg-white p-6 text-left hover:border-teal-400 hover:bg-teal-50"
                  >
                    <p className="text-3xl font-black text-slate-900">
                      #{formatPedido(item.id)}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-700">
                      {item.cliente.nombre}
                    </p>

                    <p className="mt-1 text-xl text-slate-500">
                      Tel: {item.cliente.telefono || "No registrado"}
                    </p>

                    <p className="mt-3 text-xl font-black text-red-600">
                      Saldo: {money(sal)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {pedido && (
          <div className="mt-8 space-y-8">
            <div className="card p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-lg font-black text-teal-600">
                    Pedido encontrado
                  </p>

                  <h2 className="mt-2 text-5xl font-black text-slate-900">
                    #{formatPedido(pedido.id)}
                  </h2>

                  <p className="mt-3 text-3xl font-black text-slate-800">
                    {pedido.cliente.nombre}
                  </p>

                  <p className="mt-1 text-2xl text-slate-500">
                    Tel: {pedido.cliente.telefono || "No registrado"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPedidoActivo(null)}
                  className="rounded-3xl bg-slate-200 px-6 py-4 text-xl font-black text-slate-700"
                >
                  Cambiar pedido
                </button>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-4">
                <InfoCard label="Total" value={money(pedido.total)} />
                <InfoCard label="Abonado" value={money(abonado)} />
                <InfoCard
                  label="Saldo"
                  value={money(saldo)}
                  danger={saldo > 0}
                />
                <InfoCard label="Prendas pendientes" value={prendasPendientes} />
              </div>
            </div>

            {saldo > 0 && (
              <div className="card border-4 border-red-200 p-8">
                <h2 className="text-4xl font-black text-red-600">
                  Este pedido tiene saldo pendiente
                </h2>

                <p className="mt-2 text-xl text-slate-600">
                  Antes de entregar completo debe registrar el pago o hacer un
                  retiro parcial con abono.
                </p>

                <form
                  action={agregarAbonoEmpleado}
                  className="mt-6 grid gap-4 md:grid-cols-[1fr_260px_260px]"
                >
                  <input type="hidden" name="pedidoId" value={pedido.id} />

                  <input
                    name="valor"
                    type="number"
                    min="0"
                    step="1000"
                    required
                    placeholder="Valor del abono"
                    className="rounded-3xl border p-6 text-3xl font-black"
                  />

                  <select
                    name="metodo"
                    className="rounded-3xl border p-6 text-2xl font-black"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>

                  <button className="rounded-3xl bg-teal-500 px-8 py-6 text-2xl font-black text-white">
                    Registrar abono
                  </button>
                </form>
              </div>
            )}

            <div className="card p-8">
              <h2 className="text-4xl font-black text-slate-900">
                ¿Qué va a entregar?
              </h2>

              <p className="mt-2 text-xl text-slate-500">
                Elige una prenda para retiro parcial o entrega todo el pedido si
                no tiene saldo.
              </p>

              <div className="mt-8 space-y-5">
                {pedido.prendas.map((prenda: any) => {
                  const { entregadas, pendientes } = pendientePrenda(prenda);

                  return (
                    <div
                      key={prenda.id}
                      className="rounded-3xl border bg-slate-50 p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                          <p className="text-3xl font-black text-slate-900">
                            {prenda.tipo}
                          </p>

                          <p className="mt-1 text-2xl font-bold text-slate-600">
                            {prenda.servicio}
                          </p>

                          <p className="mt-2 text-xl text-slate-500">
                            Recibidas: {prenda.cantidad} · Entregadas:{" "}
                            {entregadas} · Pendientes: {pendientes}
                          </p>

                          {prenda.descripcion && (
                            <p className="mt-3 rounded-2xl bg-orange-100 p-4 text-xl font-black text-orange-700">
                              ⚠️ {prenda.descripcion}
                            </p>
                          )}
                        </div>

                        <p className="text-3xl font-black text-teal-600">
                          {money(prenda.valor)}
                        </p>
                      </div>

                      {pendientes > 0 ? (
                        <details className="mt-6">
                          <summary className="cursor-pointer rounded-3xl bg-slate-900 p-5 text-center text-2xl font-black text-white">
                            Retirar parcialmente
                          </summary>

                          <form
                            action={retirarParcialEmpleado}
                            className="mt-5 grid gap-4 md:grid-cols-2"
                          >
                            <input
                              type="hidden"
                              name="pedidoId"
                              value={pedido.id}
                            />

                            <input
                              type="hidden"
                              name="prendaId"
                              value={prenda.id}
                            />

                            <input
                              name="cantidad"
                              type="number"
                              min="1"
                              max={pendientes}
                              required
                              placeholder={`Cantidad máximo ${pendientes}`}
                              className="rounded-3xl border p-6 text-2xl font-black"
                            />

                            {saldo > 0 && (
                              <input
                                name="abono"
                                type="number"
                                min="0"
                                step="1000"
                                required
                                placeholder="Abono obligatorio"
                                className="rounded-3xl border p-6 text-2xl font-black"
                              />
                            )}

                            <select
                              name="metodo"
                              className="rounded-3xl border p-6 text-2xl font-black"
                            >
                              <option value="Efectivo">Efectivo</option>
                              <option value="Nequi">Nequi</option>
                              <option value="Daviplata">Daviplata</option>
                              <option value="Transferencia">
                                Transferencia
                              </option>
                              <option value="Tarjeta">Tarjeta</option>
                            </select>

                            <input
                              name="observacion"
                              placeholder="Observación"
                              className="rounded-3xl border p-6 text-2xl font-black"
                            />

                            <button className="rounded-3xl bg-teal-500 p-6 text-2xl font-black text-white md:col-span-2">
                              Confirmar retiro parcial
                            </button>
                          </form>
                        </details>
                      ) : (
                        <p className="mt-5 rounded-3xl bg-emerald-100 p-5 text-2xl font-black text-emerald-700">
                          Esta prenda ya fue entregada.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {saldo <= 0 && prendasPendientes > 0 && (
                <form action={entregarCompletoEmpleado} className="mt-8">
                  <input type="hidden" name="pedidoId" value={pedido.id} />

                  <button className="w-full rounded-3xl bg-teal-500 p-8 text-4xl font-black text-white shadow-lg hover:bg-teal-600">
                    ✅ Entregar todo el pedido
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>

      <p
        className={`mt-2 text-3xl font-black ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}