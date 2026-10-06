"use client";

import { useState } from "react";
import Link from "next/link";
import MoneyInput from "@/components/MoneyInput";
import FieldIcon from "@/components/FieldIcon";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
};

type TarifaItem = {
  categoria: string;
  item: string;
  precioMin: number;
  precioMax: number | null;
};

const PERSONALIZADA = "__personalizada__";

function formatoPrecio(t: TarifaItem) {
  const f = (n: number) => `$${n.toLocaleString("es-CO")}`;
  return t.precioMax != null ? `${f(t.precioMin)} – ${f(t.precioMax)}` : f(t.precioMin);
}

function precioSugerido(t: TarifaItem) {
  return t.precioMax != null ? Math.round((t.precioMin + t.precioMax) / 2) : t.precioMin;
}

export default function NuevoPedidoForm({
  q,
  currentPage,
  totalPages,
  totalClientes,
  clientes,
  clienteSeleccionado,
  tarifario,
  crearClienteAction,
}: {
  q: string;
  currentPage: number;
  totalPages: number;
  totalClientes: number;
  clientes: Cliente[];
  clienteSeleccionado: Cliente | null;
  tarifario: TarifaItem[];
  crearClienteAction: (formData: FormData) => void;
}) {
  const [items, setItems] = useState([
    { id: Date.now(), categoria: "", precio: null as number | null },
  ]);

  const categorias = Array.from(new Set(tarifario.map((t) => t.categoria))).sort((a, b) =>
    a.localeCompare(b, "es")
  );

  function agregarServicio() {
    setItems((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), categoria: "", precio: null },
    ]);
  }

  function eliminarServicio(id: number) {
    setItems((prev) => prev.length === 1 ? prev : prev.filter((item) => item.id !== id));
  }

  function actualizarCategoria(id: number, categoria: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, categoria, precio: null } : it))
    );
  }

  function seleccionarItem(id: number, categoria: string, itemNombre: string) {
    const tarifa = tarifario.find((t) => t.categoria === categoria && t.item === itemNombre);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, precio: tarifa ? precioSugerido(tarifa) : null } : it))
    );
  }

  async function handleSubmitPedido(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const servicios = formData.getAll("servicio");
    const tipos = formData.getAll("tipo");
    const descripciones = formData.getAll("descripcion");
    const cantidades = formData.getAll("cantidad");
    const valores = formData.getAll("valor");

    const prendas = servicios.map((_, index) => ({
      servicio: String(servicios[index] || ""),
      tipo: String(tipos[index] || ""),
      descripcion: String(descripciones[index] || ""),
      cantidad: String(cantidades[index] || ""),
      valor: String(valores[index] || ""),
    }));

    const payload = {
      clienteId: String(formData.get("clienteId") || ""),
      observacion: String(formData.get("observacion") || ""),
      abono: String(formData.get("abono") || ""),
      metodo: String(formData.get("metodo") || ""),
      prendas,
    };

    const res = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("No se pudo guardar el pedido. Intenta de nuevo.");
      return;
    }

    const data = await res.json();
    window.location.href = `/recibos/${data.id}/pdf`;
  }

  return (
    <div className="page-frame page-frame--wide">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <p className="page-kicker text-brand-500">
          Nueva entrada
        </p>
        <h1 className="page-title">
          Registrar pedido
        </h1>
        <p className="page-subtitle">
          Selecciona o crea el cliente, luego agrega las prendas.
        </p>
      </div>

      {/* ── Selección / creación de cliente ──────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">

        {/* Clientes existentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-gray-900">Clientes existentes</h2>
              <p className="mt-0.5 text-xs text-gray-400">{totalClientes} registrados</p>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              Pág. {currentPage}
            </span>
          </div>

          <form className="mt-4 flex gap-2">
            <FieldIcon icon={<Search size={16} strokeWidth={1.75} />} className="min-w-0 flex-1">
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre o teléfono…"
                className="input-modern w-full"
              />
            </FieldIcon>
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
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
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
                    <Check size={16} strokeWidth={2.5} className="shrink-0 text-brand-500" aria-hidden="true" />
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
                className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  currentPage === 1
                    ? "pointer-events-none text-gray-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                Anterior
              </Link>
              <span className="text-xs font-semibold text-gray-400">
                {currentPage} / {totalPages}
              </span>
              <Link
                href={`/pedidos/nuevo?q=${q}&page=${Math.min(currentPage + 1, totalPages)}`}
                className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  currentPage >= totalPages
                    ? "pointer-events-none text-gray-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                Siguiente
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        {/* Crear cliente nuevo */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900">Crear cliente nuevo</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Si el cliente ya tiene teléfono registrado, se reutilizará.
          </p>

          <form action={crearClienteAction} className="mt-5 grid gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">
                Nombre <span className="text-red-400">*</span>
              </label>
              <FieldIcon icon={<User size={16} strokeWidth={1.75} />}>
                <input name="nombre" required placeholder="Ej. María García" className="input-modern w-full" />
              </FieldIcon>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Teléfono</label>
              <FieldIcon icon={<Phone size={16} strokeWidth={1.75} />}>
                <input name="telefono" placeholder="Ej. 3001234567" className="input-modern w-full" />
              </FieldIcon>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">Dirección</label>
              <FieldIcon icon={<MapPin size={16} strokeWidth={1.75} />}>
                <input name="direccion" placeholder="Ej. Calle 5 # 10-20" className="input-modern w-full" />
              </FieldIcon>
            </div>
            <button className="btn-primary mt-1">
              Crear y seleccionar cliente
            </button>
          </form>
        </div>
      </div>

      {/* ── Formulario del pedido ─────────────────────────── */}
      {clienteSeleccionado ? (
        <form onSubmit={handleSubmitPedido} className="card mt-5 overflow-hidden">
          <input type="hidden" name="clienteId" value={clienteSeleccionado.id} />

          {/* Cliente seleccionado banner */}
          <div className="flex items-center gap-4 border-b border-gray-100 bg-brand-50 px-6 py-4 dark:border-white/[0.07] dark:bg-brand-500/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">
              {clienteSeleccionado.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400">Cliente seleccionado</p>
              <p className="font-bold text-gray-900">{clienteSeleccionado.nombre}</p>
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
              <h2 className="font-bold text-gray-900">Prendas y servicios</h2>
              <button
                type="button"
                onClick={agregarServicio}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
              >
                <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
                Agregar prenda
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const itemsCategoria = tarifario.filter((t) => t.categoria === item.categoria);
                const esPersonalizada = item.categoria === PERSONALIZADA;
                const mostrarSelectItem = item.categoria !== "" && !esPersonalizada;

                return (
                <div key={item.id} className="card-well p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-gray-700">Prenda / servicio</span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarServicio(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[140px_150px_1fr_90px_160px]">
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
                      <label className="mb-1 block text-xs font-semibold text-gray-400">Categoría</label>
                      <select
                        value={item.categoria}
                        onChange={(e) => actualizarCategoria(item.id, e.target.value)}
                        className="input-modern"
                      >
                        <option value="" disabled>Categoría</option>
                        <option value={PERSONALIZADA}>Personalizada</option>
                        {categorias.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-400">Prenda</label>
                      {mostrarSelectItem ? (
                        <select
                          key={item.categoria}
                          name="tipo"
                          required
                          defaultValue=""
                          onChange={(e) => seleccionarItem(item.id, item.categoria, e.target.value)}
                          className="input-modern"
                        >
                          <option value="" disabled>Ítem</option>
                          {itemsCategoria.map((t) => (
                            <option key={t.item} value={t.item}>
                              {t.item} — {formatoPrecio(t)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          key={item.categoria}
                          name="tipo"
                          required
                          placeholder="Ej: camisa, cobija, pantalón…"
                          className="input-modern"
                        />
                      )}
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
                      <MoneyInput name="valor" value={item.precio} placeholder="$ Valor total" />
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
                );
              })}
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
              <button className="btn-primary gap-2">
                <FileText size={16} strokeWidth={2} aria-hidden="true" />
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
          <div className="mx-auto mb-4 figure-well h-14 w-14">
            <Users size={28} strokeWidth={1.5} className="text-[color:var(--text-3)]" aria-hidden="true" />
          </div>
          <p className="font-bold text-[color:var(--text-3)]">
            Selecciona un cliente o crea uno nuevo para continuar.
          </p>
        </div>
      )}
    </div>
  );
}
