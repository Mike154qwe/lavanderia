"use client";

import { useMemo, useState } from "react";

type ItemPedido = {
  id: number;
  tipo: string;
  servicio: string;
  cantidad: number;
  descripcion: string;
  valor: number;
};

const LIMITE_PRENDAS = 10;

const PRENDAS = [
  { nombre: "Camisa", emoji: "👔" },
  { nombre: "Pantalón", emoji: "👖" },
  { nombre: "Chaqueta", emoji: "🧥" },
  { nombre: "Cubrelecho", emoji: "🛏️" },
  { nombre: "Tenis", emoji: "👟" },
  { nombre: "Traje", emoji: "🤵" },
  { nombre: "Vestido", emoji: "👗" },
  { nombre: "Cobija", emoji: "🧺" },
  { nombre: "Tapete", emoji: "🧽" },
];

const SERVICIOS = ["Lavado", "Planchado", "Lavado y planchado", "Tintura"];

const NOVEDADES = [
  "Roto",
  "Manchado",
  "Sin cremallera",
  "Descocido",
  "Sin botón",
  "Delicado",
  "Pierde color",
  "Quemado",
];

const VALORES = [5000, 8000, 10000, 15000, 20000, 25000, 30000];

const NOMBRES_PASO = [
  "",
  "Datos del cliente",
  "Tipo de prenda",
  "Servicio",
  "Cantidad",
  "Estado de la prenda",
  "Valor",
  "Resumen",
];

function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function nuevoItem(): ItemPedido {
  return {
    id: Date.now() + Math.random(),
    tipo: "",
    servicio: "",
    cantidad: 1,
    descripcion: "",
    valor: 0,
  };
}

export default function PedidoRapidoForm({
  guardarPedidoRapidoAction,
}: {
  guardarPedidoRapidoAction: (formData: FormData) => void;
}) {
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [itemActual, setItemActual] = useState<ItemPedido>(nuevoItem());
  const [novedades, setNovedades] = useState<string[]>([]);

  const [abono, setAbono] = useState(0);
  const [metodo, setMetodo] = useState("Efectivo");

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.valor, 0),
    [items]
  );

  const saldo = total - abono;
  const totalPrendas = items.reduce((sum, item) => sum + item.cantidad, 0);

  const descripcionActual = useMemo(() => {
    return [...novedades, itemActual.descripcion.trim()]
      .filter(Boolean)
      .join(" - ");
  }, [novedades, itemActual.descripcion]);

  function actualizarItem(cambios: Partial<ItemPedido>) {
    setItemActual((prev) => ({ ...prev, ...cambios }));
  }

  function toggleNovedad(novedad: string) {
    setNovedades((prev) =>
      prev.includes(novedad)
        ? prev.filter((n) => n !== novedad)
        : [...prev, novedad]
    );
  }

  function limpiarItemActual() {
    setItemActual(nuevoItem());
    setNovedades([]);
  }

  function agregarItemYRevisar() {
    if (
      !itemActual.tipo ||
      !itemActual.servicio ||
      itemActual.cantidad <= 0 ||
      itemActual.valor <= 0 ||
      items.length >= LIMITE_PRENDAS
    ) {
      return;
    }

    setItems((prev) => [
      ...prev,
      { ...itemActual, descripcion: descripcionActual },
    ]);

    limpiarItemActual();
    setPaso(7);
  }

  function agregarOtraPrenda() {
    if (items.length >= LIMITE_PRENDAS) return;
    limpiarItemActual();
    setPaso(2);
  }

  function editarCliente() {
    setPaso(1);
  }

  function eliminarItem(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function puedeContinuar(): boolean {
    if (paso === 1) return nombre.trim() !== "" && telefono.trim() !== "";
    if (paso === 2) return itemActual.tipo !== "";
    if (paso === 3) return itemActual.servicio !== "";
    if (paso === 4) return itemActual.cantidad > 0;
    if (paso === 5) return true;
    if (paso === 6) return itemActual.valor > 0;
    return items.length > 0;
  }

  function siguiente() {
    if (paso === 6) {
      agregarItemYRevisar();
      return;
    }
    setPaso((prev) => Math.min(7, prev + 1));
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="p-6">
        <form action={guardarPedidoRapidoAction} className="mx-auto max-w-4xl">
          {/* Campos hidden para el servidor */}
          <input type="hidden" name="nombre" value={nombre} />
          <input type="hidden" name="telefono" value={telefono} />
          <input type="hidden" name="abono" value={abono} />
          <input type="hidden" name="metodo" value={metodo} />
          {items.map((item) => (
            <div key={item.id}>
              <input type="hidden" name="tipo" value={item.tipo} />
              <input type="hidden" name="servicio" value={item.servicio} />
              <input type="hidden" name="cantidad" value={item.cantidad} />
              <input type="hidden" name="descripcion" value={item.descripcion} />
              <input type="hidden" name="valor" value={item.valor} />
            </div>
          ))}

          {/* Encabezado de paso */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-base font-black uppercase tracking-widest text-teal-600">
              Nuevo pedido
            </p>

            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black text-slate-900">
                  {paso === 7 ? "Resumen" : `Paso ${paso} de 6`}
                </h1>
                <p className="mt-1 text-xl font-bold text-slate-500">
                  {NOMBRES_PASO[paso]}
                </p>
              </div>

              {/* Prendas agregadas (visible en todos excepto paso 7) */}
              {items.length > 0 && paso !== 7 && (
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-500">
                    {items.length}/{LIMITE_PRENDAS} prendas
                  </p>
                  <p className="text-2xl font-black text-teal-600">
                    {money(total)}
                  </p>
                </div>
              )}
            </div>

            {/* Barra de progreso (pasos 1-6) */}
            {paso < 7 && (
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${(paso / 6) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Contenido del paso */}
          <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">

            {/* PASO 1 — Datos del cliente */}
            {paso === 1 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  ¿Cómo se llama el cliente?
                </h2>

                <div className="mt-8 grid gap-5">
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-3xl border-2 border-slate-200 p-6 text-3xl font-bold placeholder:text-slate-300 focus:border-teal-400 focus:outline-none"
                    placeholder="Nombre completo"
                    autoFocus
                  />

                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    type="tel"
                    className="w-full rounded-3xl border-2 border-slate-200 p-6 text-3xl font-bold placeholder:text-slate-300 focus:border-teal-400 focus:outline-none"
                    placeholder="Teléfono"
                  />
                </div>
              </div>
            )}

            {/* PASO 2 — Tipo de prenda */}
            {paso === 2 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  ¿Qué prenda dejó?
                </h2>

                <div className="mt-8 grid grid-cols-3 gap-4">
                  {PRENDAS.map((prenda) => (
                    <button
                      key={prenda.nombre}
                      type="button"
                      onClick={() => actualizarItem({ tipo: prenda.nombre })}
                      className={`rounded-3xl border-2 p-6 text-center transition ${
                        itemActual.tipo === prenda.nombre
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50"
                      }`}
                    >
                      <div className="text-5xl">{prenda.emoji}</div>
                      <div className="mt-3 text-lg font-black text-slate-800">
                        {prenda.nombre}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 3 — Servicio */}
            {paso === 3 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  ¿Qué servicio necesita?
                </h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {SERVICIOS.map((servicio) => (
                    <button
                      key={servicio}
                      type="button"
                      onClick={() => actualizarItem({ servicio })}
                      className={`rounded-3xl border-2 p-8 text-2xl font-black transition ${
                        itemActual.servicio === servicio
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-800 hover:border-teal-300"
                      }`}
                    >
                      {servicio}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 4 — Cantidad */}
            {paso === 4 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  ¿Cuántas prendas?
                </h2>

                <div className="mt-12 flex items-center justify-center gap-8">
                  <button
                    type="button"
                    onClick={() =>
                      actualizarItem({ cantidad: Math.max(1, itemActual.cantidad - 1) })
                    }
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-5xl font-black text-white shadow-lg transition active:scale-95"
                  >
                    −
                  </button>

                  <div className="min-w-[140px] rounded-3xl bg-slate-50 px-12 py-8 text-center text-8xl font-black text-slate-900 shadow-inner">
                    {itemActual.cantidad}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      actualizarItem({ cantidad: itemActual.cantidad + 1 })
                    }
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-500 text-5xl font-black text-white shadow-lg transition active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* PASO 5 — Novedades */}
            {paso === 5 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  ¿Tiene alguna novedad?
                </h2>

                <p className="mt-2 text-lg text-slate-500">
                  Toca las que apliquen. Puedes seleccionar varias.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {NOVEDADES.map((novedad) => (
                    <button
                      key={novedad}
                      type="button"
                      onClick={() => toggleNovedad(novedad)}
                      className={`rounded-3xl border-2 p-5 text-lg font-black transition ${
                        novedades.includes(novedad)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
                      }`}
                    >
                      {novedades.includes(novedad) ? "⚠️ " : ""}
                      {novedad}
                    </button>
                  ))}
                </div>

                <textarea
                  value={itemActual.descripcion}
                  onChange={(e) => actualizarItem({ descripcion: e.target.value })}
                  rows={3}
                  className="mt-6 w-full rounded-3xl border-2 border-slate-200 p-5 text-xl placeholder:text-slate-300 focus:border-teal-400 focus:outline-none"
                  placeholder="Descripción adicional (opcional)"
                />

                {descripcionActual && (
                  <div className="mt-4 rounded-3xl bg-orange-50 px-5 py-4">
                    <p className="text-sm font-bold text-orange-500">
                      Novedades registradas:
                    </p>
                    <p className="mt-1 text-xl font-black text-orange-700">
                      {descripcionActual}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PASO 6 — Valor */}
            {paso === 6 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  ¿Cuánto vale esta prenda?
                </h2>

                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {VALORES.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => actualizarItem({ valor })}
                      className={`rounded-3xl border-2 p-6 text-2xl font-black transition ${
                        itemActual.valor === valor
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-800 hover:border-teal-300"
                      }`}
                    >
                      {money(valor)}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  value={itemActual.valor || ""}
                  onChange={(e) => actualizarItem({ valor: Number(e.target.value || 0) })}
                  className="mt-6 w-full rounded-3xl border-2 border-slate-200 p-6 text-3xl font-bold focus:border-teal-400 focus:outline-none"
                  placeholder="Otro valor..."
                />
              </div>
            )}

            {/* PASO 7 — Resumen */}
            {paso === 7 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  Revisa el pedido
                </h2>

                <p className="mt-2 text-lg font-bold text-red-500">
                  Después de confirmar se imprime el recibo.
                </p>

                {items.length === 0 ? (
                  <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center">
                    <p className="text-2xl font-black text-red-600">
                      Debes agregar al menos una prenda.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cliente */}
                    <div className="mt-6 flex items-center justify-between rounded-3xl bg-slate-50 p-5">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                          Cliente
                        </p>
                        <p className="mt-1 text-2xl font-black text-slate-900">
                          {nombre}
                        </p>
                        <p className="text-xl font-bold text-slate-600">
                          {telefono}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={editarCliente}
                        className="rounded-2xl bg-slate-200 px-5 py-3 text-base font-black text-slate-700 transition hover:bg-slate-300"
                      >
                        ✏️ Editar
                      </button>
                    </div>

                    {/* Prendas */}
                    <div className="mt-5 space-y-4">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-3xl border-2 border-slate-100 bg-white p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-2xl font-black text-slate-900">
                                {index + 1}. {item.tipo} × {item.cantidad}
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-600">
                                {item.servicio}
                              </p>
                              {item.descripcion ? (
                                <p className="mt-2 rounded-2xl bg-orange-50 px-4 py-2 text-base font-black text-orange-700">
                                  ⚠️ {item.descripcion}
                                </p>
                              ) : (
                                <p className="mt-2 rounded-2xl bg-emerald-50 px-4 py-2 text-base font-black text-emerald-700">
                                  ✅ Sin novedades
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-black text-teal-600">
                                {money(item.valor)}
                              </p>
                              <button
                                type="button"
                                onClick={() => eliminarItem(item.id)}
                                className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100"
                              >
                                🗑 Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totales y pago */}
                    <div className="mt-6 grid gap-5 sm:grid-cols-3">
                      <div className="rounded-3xl bg-teal-50 p-5 text-center">
                        <p className="text-sm font-bold uppercase text-teal-600">
                          Total — {totalPrendas} prendas
                        </p>
                        <p className="mt-1 text-4xl font-black text-teal-700">
                          {money(total)}
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-xl font-black text-slate-800">
                          Abono inicial
                        </label>
                        <input
                          type="number"
                          value={abono || ""}
                          onChange={(e) => setAbono(Number(e.target.value || 0))}
                          className="w-full rounded-3xl border-2 border-slate-200 p-5 text-3xl font-black focus:border-teal-400 focus:outline-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xl font-black text-slate-800">
                          Método de pago
                        </label>
                        <select
                          value={metodo}
                          onChange={(e) => setMetodo(e.target.value)}
                          className="w-full rounded-3xl border-2 border-slate-200 p-5 text-2xl font-black focus:border-teal-400 focus:outline-none"
                        >
                          <option value="Efectivo">💵 Efectivo</option>
                          <option value="Nequi">📱 Nequi</option>
                          <option value="Daviplata">📱 Daviplata</option>
                          <option value="Transferencia">🏦 Transferencia</option>
                          <option value="Tarjeta">💳 Tarjeta</option>
                        </select>
                      </div>
                    </div>

                    {saldo > 0 && (
                      <div className="mt-4 rounded-3xl bg-red-50 p-4 text-center">
                        <p className="text-lg font-bold text-red-500">
                          Saldo pendiente
                        </p>
                        <p className="text-4xl font-black text-red-600">
                          {money(saldo)}
                        </p>
                      </div>
                    )}

                    <div className="mt-6 rounded-3xl bg-yellow-50 p-5 text-center">
                      <p className="text-xl font-black text-yellow-700">
                        ¿Todo está bien?
                      </p>
                      <p className="mt-1 text-base font-semibold text-yellow-600">
                        Si falta una prenda, toca "Agregar otra".
                        Si está bien, toca "Confirmar".
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                      <button
                        type="button"
                        disabled={items.length >= LIMITE_PRENDAS}
                        onClick={agregarOtraPrenda}
                        className="flex-1 rounded-3xl bg-slate-900 p-6 text-2xl font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        ➕ Agregar otra prenda
                      </button>

                      <button
                        type="submit"
                        className="flex-1 rounded-3xl bg-teal-500 p-6 text-2xl font-black text-white shadow-lg transition hover:bg-teal-600 active:scale-95"
                      >
                        ✅ Confirmar e imprimir
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Botones Atrás / Siguiente (pasos 1-6) */}
          {paso < 7 && (
            <div className="mt-6 flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setPaso((p) => Math.max(1, p - 1))}
                className="rounded-3xl bg-slate-200 px-8 py-5 text-xl font-black text-slate-800 transition hover:bg-slate-300"
              >
                ⬅️ Atrás
              </button>

              <button
                type="button"
                disabled={!puedeContinuar()}
                onClick={siguiente}
                className="flex-1 rounded-3xl bg-teal-500 px-8 py-5 text-xl font-black text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {paso === 6 ? "Agregar prenda ➡️" : "Siguiente ➡️"}
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
