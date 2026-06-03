"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MoneyInput from "@/components/MoneyInput";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
};

export default function NuevoPedidoForm({
  q,
  currentPage,
  totalPages,
  totalClientes,
  clientes,
  clienteSeleccionado,
  crearClienteAction,
  guardarPedidoAction,
}: {
  q: string;
  currentPage: number;
  totalPages: number;
  totalClientes: number;

  clientes: Cliente[];

  clienteSeleccionado: Cliente | null;

  crearClienteAction: (formData: FormData) => void;

  guardarPedidoAction: (formData: FormData) => void;
}) {
  const [items, setItems] = useState([
    {
      id: Date.now(),
    },
  ]);

  function agregarServicio() {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
      },
    ]);
  }

  function eliminarServicio(id: number) {
    setItems((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((item) => item.id !== id)
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <section className="ml-72 p-8">
        <div className="card p-8">
          <h1 className="title-xl text-slate-900">
            Nueva entrada
          </h1>

          <p className="mt-2 text-slate-500">
            Primero selecciona o crea el cliente. Luego registra el pedido.
          </p>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section className="card p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="title-lg text-slate-900">
                  Clientes existentes
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {totalClientes} clientes registrados
                </p>
              </div>

              <span className="badge badge-success">
                Página {currentPage}
              </span>
            </div>

            <form className="mt-6 flex gap-3">
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre o teléfono"
                className="input-modern"
              />

              <button className="btn-primary">
                Buscar
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {clientes.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/pedidos/nuevo?clienteId=${cliente.id}`}
                  className={`block rounded-3xl border p-5 transition ${
                    clienteSeleccionado?.id === cliente.id
                      ? "border-teal-400 bg-teal-50"
                      : "bg-slate-50 hover:border-teal-300 hover:bg-teal-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900">
                        {cliente.nombre}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Tel:{" "}
                        {cliente.telefono ||
                          "No registrado"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Dirección:{" "}
                        {cliente.direccion ||
                          "No registrada"}
                      </p>
                    </div>

                    <div>
                      <span className="rounded-full bg-teal-100 px-4 py-2 text-xs font-bold text-teal-700">
                        Seleccionar
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {clientes.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-semibold text-slate-500">
                    No se encontraron clientes.
                  </p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link
                  href={`/pedidos/nuevo?q=${q}&page=${Math.max(
                    currentPage - 1,
                    1
                  )}`}
                  className={`rounded-2xl px-5 py-3 font-bold ${
                    currentPage === 1
                      ? "pointer-events-none bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Anterior
                </Link>

                <span className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700">
                  Página {currentPage} de {totalPages}
                </span>

                <Link
                  href={`/pedidos/nuevo?q=${q}&page=${Math.min(
                    currentPage + 1,
                    totalPages
                  )}`}
                  className={`rounded-2xl px-5 py-3 font-bold ${
                    currentPage >= totalPages
                      ? "pointer-events-none bg-slate-100 text-slate-400"
                      : "bg-teal-500 text-white hover:bg-teal-600"
                  }`}
                >
                  Siguiente
                </Link>
              </div>
            )}
          </section>

          <section className="card p-8">
            <h2 className="title-lg text-slate-900">
              Crear cliente nuevo
            </h2>

            <form
              action={crearClienteAction}
              className="mt-6 grid gap-4"
            >
              <input
                name="nombre"
                required
                placeholder="Nombre cliente"
                className="input-modern"
              />

              <input
                name="telefono"
                placeholder="Teléfono"
                className="input-modern"
              />

              <input
                name="direccion"
                placeholder="Dirección"
                className="input-modern"
              />

              <button className="btn-primary">
                Crear cliente
              </button>
            </form>
          </section>
        </div>

        {clienteSeleccionado ? (
          <form
            action={guardarPedidoAction}
            className="card mt-8 p-8"
          >
            <input
              type="hidden"
              name="clienteId"
              value={clienteSeleccionado.id}
            />

            <div className="rounded-3xl bg-teal-50 p-5">
              <p className="text-sm font-bold text-teal-700">
                Cliente seleccionado
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                {clienteSeleccionado.nombre}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Tel:{" "}
                {clienteSeleccionado.telefono ||
                  "No registrado"}{" "}
                · Dirección:{" "}
                {clienteSeleccionado.direccion ||
                  "No registrada"}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <h2 className="title-lg text-slate-900">
                Servicios / prendas
              </h2>

              <button
                type="button"
                onClick={agregarServicio}
                className="btn-primary"
              >
                + Agregar servicio
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-3xl bg-slate-50 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-black text-slate-800">
                      Servicio #{index + 1}
                    </p>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          eliminarServicio(item.id)
                        }
                        className="btn-danger"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[180px_1fr_140px_190px]">
                    <select
                      name="servicio"
                      required
                      defaultValue=""
                      className="input-modern"
                    >
                      <option value="">
                        Servicio
                      </option>

                      <option value="Lavado">
                        Lavado
                      </option>

                      <option value="Planchado">
                        Planchado
                      </option>

                      <option value="Tintura">
                        Tintura
                      </option>

                      <option value="Lavado y planchado">
                        Lavado y planchado
                      </option>

                      <option value="Otro">
                        Otro
                      </option>
                    </select>

                    <input
                      name="tipo"
                      required
                      placeholder="Prenda. Ej: camisa, cobija..."
                      className="input-modern"
                    />

                    <input
                      name="cantidad"
                      type="number"
                      min="1"
                      defaultValue={1}
                      required
                      placeholder="Cantidad"
                      className="input-modern"
                    />

                    <MoneyInput
                      name="valor"
                      placeholder="Valor final"
                    />
                  </div>

                  <textarea
                    name="descripcion"
                    rows={4}
                    placeholder="Descripción / observación de la prenda"
                    className="textarea-modern mt-4"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Abono inicial
                </label>

                <MoneyInput
                  name="abono"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Método de pago
                </label>

                <select
                  name="metodo"
                  className="input-modern"
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

                  <option value="Tarjeta">
                    Tarjeta
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Observación general
                </label>

                <textarea
                  name="observacion"
                  rows={4}
                  placeholder="Observación general"
                  className="textarea-modern"
                />
              </div>
            </div>

            <div className="mt-8">
              <button className="btn-primary">
                Guardar pedido y generar PDF
              </button>
            </div>
          </form>
        ) : (
          <div className="card mt-8 p-10 text-center">
            <p className="text-lg font-bold text-slate-700">
              Selecciona un cliente o crea uno nuevo para iniciar el pedido.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}