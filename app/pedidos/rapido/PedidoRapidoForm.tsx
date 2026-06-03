"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";

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
        ? prev.filter((item) => item !== novedad)
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
      {
        ...itemActual,
        descripcion: descripcionActual,
      },
    ]);

    limpiarItemActual();
    setPaso(7);
  }

  function agregarOtraPrenda() {
    if (items.length >= LIMITE_PRENDAS) return;
    limpiarItemActual();
    setPaso(2);
  }

  function eliminarItem(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function puedeContinuar() {
    if (paso === 1) return nombre.trim() && telefono.trim();
    if (paso === 2) return itemActual.tipo;
    if (paso === 3) return itemActual.servicio;
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
      <Navbar />

      <section className="ml-72 p-8">
        <form action={guardarPedidoRapidoAction} className="mx-auto max-w-7xl">
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

          <div className="card p-8">
            <p className="text-lg font-black text-teal-600">Pedido rápido</p>

            <h1 className="mt-2 text-5xl font-black text-slate-900">
              Paso {paso} de 7
            </h1>

            <p className="mt-3 text-xl text-slate-500">
              Registra una o varias prendas en el mismo pedido.
            </p>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${(paso / 7) * 100}%` }}
              />
            </div>
          </div>

          {items.length > 0 && paso !== 7 && (
            <div className="card mt-6 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">
                  Prendas agregadas: {items.length} / {LIMITE_PRENDAS}
                </h2>

                <p className="text-3xl font-black text-teal-600">
                  Total: {money(total)}
                </p>
              </div>
            </div>
          )}

          <div className="card mt-8 p-8">
            {paso === 1 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  1. Datos del cliente
                </h2>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-3xl border p-6 text-3xl font-bold"
                    placeholder="Nombre cliente"
                    autoFocus
                  />

                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-3xl border p-6 text-3xl font-bold"
                    placeholder="Teléfono"
                  />
                </div>
              </div>
            )}

            {paso === 2 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  2. ¿Qué prenda dejó?
                </h2>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {PRENDAS.map((prenda) => (
                    <button
                      key={prenda.nombre}
                      type="button"
                      onClick={() => actualizarItem({ tipo: prenda.nombre })}
                      className={`rounded-3xl border p-8 text-center text-2xl font-black ${
                        itemActual.tipo === prenda.nombre
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-6xl">{prenda.emoji}</div>
                      <div className="mt-4">{prenda.nombre}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === 3 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  3. ¿Qué servicio necesita?
                </h2>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  {SERVICIOS.map((servicio) => (
                    <button
                      key={servicio}
                      type="button"
                      onClick={() => actualizarItem({ servicio })}
                      className={`rounded-3xl border p-8 text-3xl font-black ${
                        itemActual.servicio === servicio
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {servicio}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === 4 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  4. Cantidad
                </h2>

                <div className="mt-10 flex items-center justify-center gap-8">
                  <button
                    type="button"
                    onClick={() =>
                      actualizarItem({
                        cantidad: Math.max(1, itemActual.cantidad - 1),
                      })
                    }
                    className="h-24 w-24 rounded-full bg-red-500 text-5xl font-black text-white"
                  >
                    -
                  </button>

                  <div className="rounded-3xl bg-white px-16 py-10 text-7xl font-black text-slate-900 shadow">
                    {itemActual.cantidad}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      actualizarItem({ cantidad: itemActual.cantidad + 1 })
                    }
                    className="h-24 w-24 rounded-full bg-teal-500 text-5xl font-black text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {paso === 5 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  5. Estado de la prenda
                </h2>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {NOVEDADES.map((novedad) => (
                    <button
                      key={novedad}
                      type="button"
                      onClick={() => toggleNovedad(novedad)}
                      className={`rounded-3xl border p-6 text-xl font-black ${
                        novedades.includes(novedad)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      ⚠️ {novedad}
                    </button>
                  ))}
                </div>

                <textarea
                  value={itemActual.descripcion}
                  onChange={(e) =>
                    actualizarItem({ descripcion: e.target.value })
                  }
                  rows={4}
                  className="mt-8 w-full rounded-3xl border p-6 text-2xl"
                  placeholder="Descripción adicional opcional"
                />

                <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-bold text-slate-500">
                    Descripción final:
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {descripcionActual || "Sin novedades"}
                  </p>
                </div>
              </div>
            )}

            {paso === 6 && (
              <div>
                <h2 className="text-4xl font-black text-slate-900">
                  6. Valor de esta prenda
                </h2>

                <div className="mt-8 grid gap-5 md:grid-cols-4">
                  {VALORES.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => actualizarItem({ valor })}
                      className={`rounded-3xl border p-7 text-3xl font-black ${
                        itemActual.valor === valor
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {money(valor)}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  value={itemActual.valor || ""}
                  onChange={(e) =>
                    actualizarItem({ valor: Number(e.target.value || 0) })
                  }
                  className="mt-8 w-full rounded-3xl border p-6 text-3xl font-black"
                  placeholder="Otro valor"
                />
              </div>
            )}

            {paso === 7 && (
              <div>
                <h2 className="text-5xl font-black text-slate-900">
                  Revisar pedido antes de guardar
                </h2>

                <p className="mt-3 text-2xl font-bold text-red-600">
                  Revisa bien la información. Después de guardar se imprime el recibo.
                </p>

                {items.length === 0 ? (
                  <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center">
                    <p className="text-2xl font-black text-red-600">
                      Debes agregar al menos una prenda.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-8 grid gap-5 md:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-6">
                        <p className="text-sm font-black text-slate-500">
                          Cliente
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-900">
                          {nombre}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-600">
                          {telefono}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-teal-50 p-6">
                        <p className="text-sm font-black text-teal-700">
                          Total del pedido
                        </p>
                        <p className="mt-2 text-5xl font-black text-teal-600">
                          {money(total)}
                        </p>
                        <p className="mt-2 text-xl font-bold text-slate-700">
                          {totalPrendas} prendas en total
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 rounded-3xl border-4 border-teal-200 bg-white p-6">
                      <h3 className="text-3xl font-black text-slate-900">
                        Prendas agregadas
                      </h3>

                      <div className="mt-6 space-y-4">
                        {items.map((item, index) => (
                          <div
                            key={item.id}
                            className="rounded-3xl bg-slate-50 p-6"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-5">
                              <div>
                                <p className="text-3xl font-black text-slate-900">
                                  {index + 1}. {item.tipo} x {item.cantidad}
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-600">
                                  Servicio: {item.servicio}
                                </p>

                                {item.descripcion ? (
                                  <p className="mt-3 rounded-2xl bg-orange-100 p-4 text-xl font-black text-orange-700">
                                    ⚠️ {item.descripcion}
                                  </p>
                                ) : (
                                  <p className="mt-3 rounded-2xl bg-emerald-100 p-4 text-xl font-black text-emerald-700">
                                    Sin novedades
                                  </p>
                                )}
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-500">
                                  Valor
                                </p>
                                <p className="text-3xl font-black text-teal-600">
                                  {money(item.valor)}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => eliminarItem(item.id)}
                                  className="mt-4 rounded-2xl bg-red-100 px-5 py-3 text-lg font-black text-red-600"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                      <div>
                        <label className="mb-3 block text-2xl font-black text-slate-800">
                          Abono inicial
                        </label>

                        <input
                          type="number"
                          value={abono || ""}
                          onChange={(e) =>
                            setAbono(Number(e.target.value || 0))
                          }
                          className="w-full rounded-3xl border p-6 text-3xl font-black"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="mb-3 block text-2xl font-black text-slate-800">
                          Método de pago
                        </label>

                        <select
                          value={metodo}
                          onChange={(e) => setMetodo(e.target.value)}
                          className="w-full rounded-3xl border p-6 text-3xl font-black"
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Nequi">Nequi</option>
                          <option value="Daviplata">Daviplata</option>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta">Tarjeta</option>
                        </select>
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-6">
                        <p className="text-sm font-black text-slate-500">
                          Saldo pendiente
                        </p>
                        <p
                          className={`mt-2 text-4xl font-black ${
                            saldo > 0 ? "text-red-600" : "text-teal-600"
                          }`}
                        >
                          {money(Math.max(saldo, 0))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-10 rounded-3xl bg-yellow-50 p-6 text-center">
                      <p className="text-2xl font-black text-yellow-700">
                        ¿Todo está correcto?
                      </p>
                      <p className="mt-2 text-lg font-bold text-yellow-700">
                        Si falta una prenda, toca “Agregar otra prenda”. Si está bien, toca “Confirmar”.
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        type="button"
                        disabled={items.length >= LIMITE_PRENDAS}
                        onClick={agregarOtraPrenda}
                        className="flex-1 rounded-3xl bg-slate-900 p-6 text-2xl font-black text-white disabled:bg-slate-300"
                      >
                        ➕ Agregar otra prenda
                      </button>

                      <button
                        type="submit"
                        className="flex-1 rounded-3xl bg-teal-500 p-6 text-2xl font-black text-white shadow-lg hover:bg-teal-600"
                      >
                        ✅ Confirmar, guardar e imprimir
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between gap-5">
            <button
              type="button"
              onClick={() => setPaso((p) => Math.max(1, p - 1))}
              className="rounded-3xl bg-slate-300 px-10 py-6 text-2xl font-black text-slate-800"
            >
              ⬅️ Atrás
            </button>

            {paso < 7 && (
              <button
                type="button"
                disabled={!puedeContinuar()}
                onClick={siguiente}
                className="rounded-3xl bg-teal-500 px-10 py-6 text-2xl font-black text-white disabled:bg-slate-300"
              >
                {paso === 6 ? "Agregar y revisar ➡️" : "Siguiente ➡️"}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}