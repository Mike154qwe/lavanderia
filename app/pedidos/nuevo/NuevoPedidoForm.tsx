"use client";

import { useState } from "react";
import Link from "next/link";
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
  const [items, setItems] = useState([{ id: Date.now() }]);

  function agregarServicio() {
    setItems((prev) => [...prev, { id: Date.now() + Math.random() }]);
  }

  function eliminarServicio(id: number) {
    setItems((prev) => prev.length === 1 ? prev : prev.filter((item) => item.id !== id));
  }

  return (
    <div className="p-6">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
          Nueva entrada
        </p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">
          Registrar pedido
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona o crea el cliente, luego agrega las prendas.
        </p>
      </div>

      {/* ── Selección / creación de cliente ──────────────── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">

        {/* Clientes existentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-gray-900">Clientes existentes</h2>
              <p className="mt-0.5 text-xs text-gray-400">{totalClientes} registrados</p>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              Pág. {currentPage}
            </span>
          </div>

          <form className="mt-4 flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o teléfono…"
              className="input-modern flex-1"
            />
            <button className="btn-primary whitespace-nowrap">Buscar</button>
          </form>

          <div className="mt-4 space-y-2">
            {clientes.map((cliente) => {
              const activo = clienteSeleccionado?.id === cliente.id;
              const inicial = cliente.nombre.charAt(0).toUpperCase();
              return (
                <Link
                  key={cliente.id}
                  href={`/pedidos/nuevo?clienteId=${cliente.id}`}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                    activo
                      ? "border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10"
                      : "border-gray-100 hover:border-brand-300 hover:bg-brand-50 dark:border-white/[0.07] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    activo
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                  }`}>
                    {inicial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold truncate ${activo ? "text-brand-700 dark:text-brand-300" : "text-gray-900"}`}>
                      {cliente.nombre}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {cliente.telefono || "Sin teléfono"}{cliente.direccion ? ` · ${cliente.direccion}` : ""}
                    </p>
                  </div>
                  {activo && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-brand-500">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </Link>
              );
            })}

            {clientes.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
                <p className="text-sm font-semibold text-gray-400">
                  No se encontraron clientes.
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Link
                href={`/pedidos/nuevo?q=${q}&page=${Math.max(currentPage - 1, 1)}`}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  currentPage === 1
                    ? "pointer-events-none text-gray-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                ← Anterior
              </Link>
              <span className="text-xs font-semibold text-gray-400">
                {currentPage} / {totalPages}
              </span>
              <Link
                href={`/pedidos/nuevo?q=${q}&page=${Math.min(currentPage + 1, totalPages)}`}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  currentPage >= totalPages
                    ? "pointer-events-none text-gray-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                Siguiente →
              </Link>
            </div>
          )}
        </div>

        {/* Crear cliente nuevo */}
        <div className="card p-6">
          <h2 className="font-black text-gray-900">Crear cliente nuevo</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Si el cliente ya tiene teléfono registrado, se reutilizará.
          </p>

          <form action={crearClienteAction} className="mt-5 grid gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input name="nombre" required placeholder="Ej. María García" className="input-modern" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Teléfono</label>
              <input name="telefono" placeholder="Ej. 3001234567" className="input-modern" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Dirección</label>
              <input name="direccion" placeholder="Ej. Calle 5 # 10-20" className="input-modern" />
            </div>
            <button className="btn-primary mt-1">
              Crear y seleccionar cliente
            </button>
          </form>
        </div>
      </div>

      {/* ── Formulario del pedido ─────────────────────────── */}
      {clienteSeleccionado ? (
        <form action={guardarPedidoAction} className="card mt-5 overflow-hidden">
          <input type="hidden" name="clienteId" value={clienteSeleccionado.id} />

          {/* Cliente seleccionado banner */}
          <div className="flex items-center gap-4 border-b border-gray-100 bg-brand-50 px-6 py-4 dark:border-white/[0.07] dark:bg-brand-500/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-black text-white">
              {clienteSeleccionado.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400">Cliente seleccionado</p>
              <p className="font-black text-gray-900">{clienteSeleccionado.nombre}</p>
              <p className="text-xs text-gray-400">
                {clienteSeleccionado.telefono || "Sin teléfono"}
                {clienteSeleccionado.direccion ? ` · ${clienteSeleccionado.direccion}` : ""}
              </p>
            </div>
            <Link
              href="/pedidos/nuevo"
              className="ml-auto rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-100 dark:border-brand-500/30 dark:text-brand-400"
            >
              Cambiar
            </Link>
          </div>

          <div className="p-6">
            {/* Prendas */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-black text-gray-900">Prendas y servicios</h2>
              <button
                type="button"
                onClick={agregarServicio}
                className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Agregar prenda
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-gray-700">Prenda / servicio</span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarServicio(item.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[160px_1fr_110px_180px]">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-400">Servicio</label>
                      <select name="servicio" required defaultValue="" className="input-modern">
                        <option value="" disabled>Servicio</option>
                        <option value="Lavado">Lavado</option>
                        <option value="Planchado">Planchado</option>
                        <option value="Tintura">Tintura</option>
                        <option value="Lavado y planchado">Lavado y planchado</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-400">Prenda</label>
                      <input
                        name="tipo"
                        required
                        placeholder="Ej: camisa, cobija, pantalón…"
                        className="input-modern"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-400">Cantidad</label>
                      <input
                        name="cantidad"
                        type="number"
                        min="1"
                        defaultValue={1}
                        required
                        className="input-modern"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-400">Valor</label>
                      <MoneyInput name="valor" placeholder="$ Valor total" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold text-gray-400">
                      Observación de la prenda
                    </label>
                    <textarea
                      name="descripcion"
                      rows={2}
                      placeholder="Manchas, color, instrucciones especiales…"
                      className="textarea-modern"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pago y observación */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-500">Abono inicial</label>
                <MoneyInput name="abono" placeholder="0" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-500">Método de pago</label>
                <select name="metodo" className="input-modern">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-500">Observación general</label>
                <textarea
                  name="observacion"
                  rows={3}
                  placeholder="Observación del pedido completo…"
                  className="textarea-modern"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button className="btn-primary flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
                Guardar y generar recibo
              </button>
              <p className="text-xs text-gray-400">
                Se abrirá el PDF del recibo al guardar.
              </p>
            </div>
          </div>
        </form>
      ) : (
        <div className="card mt-5 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-gray-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="font-bold text-gray-500">
            Selecciona un cliente o crea uno nuevo para continuar.
          </p>
        </div>
      )}
    </div>
  );
}
