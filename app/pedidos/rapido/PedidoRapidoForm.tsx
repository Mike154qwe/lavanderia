"use client";

import { useMemo, useRef, useState } from "react";
import { money } from "@/lib/format";

type ItemPedido = {
  id: number;
  tipo: string;
  servicio: string;
  cantidad: number;
  descripcion: string;
  valor: number;
};

const PRENDAS = [
  { nombre: "Camisa",      emoji: "👔" },
  { nombre: "Pantalón",    emoji: "👖" },
  { nombre: "Chaqueta",    emoji: "🧥" },
  { nombre: "Cubrelecho",  emoji: "🛏️" },
  { nombre: "Tenis",       emoji: "👟" },
  { nombre: "Traje",       emoji: "🤵" },
  { nombre: "Vestido",     emoji: "👗" },
  { nombre: "Cobija",      emoji: "🧺" },
  { nombre: "Tapete",      emoji: "🟫" },
];

const SERVICIOS = [
  { nombre: "Lavado",             emoji: "🫧", color: "blue"   },
  { nombre: "Planchado",          emoji: "🔥", color: "orange" },
  { nombre: "Lavado y planchado", emoji: "✨", color: "purple" },
  { nombre: "Secado",             emoji: "💨", color: "sky"    },
  { nombre: "Lavado en seco",     emoji: "🧴", color: "teal"   },
  { nombre: "Tintura",            emoji: "🎨", color: "pink"   },
];

const NOVEDADES = [
  "Roto", "Manchado", "Sin cremallera", "Descocido",
  "Sin botón", "Delicado", "Pierde color", "Quemado",
];

const CANT_RAPIDAS = [1, 2, 3, 5, 10, 15, 20, 30];
const VALORES_RAPIDOS = [5000, 8000, 10000, 15000, 20000, 25000, 30000];

const SERVICIO_COLORS: Record<string, string> = {
  blue:   "border-blue-400 bg-blue-500 text-white",
  orange: "border-orange-400 bg-orange-500 text-white",
  purple: "border-purple-400 bg-purple-500 text-white",
  sky:    "border-sky-400 bg-sky-500 text-white",
  teal:   "border-teal-400 bg-teal-500 text-white",
  pink:   "border-pink-400 bg-pink-500 text-white",
};
const SERVICIO_COLORS_IDLE: Record<string, string> = {
  blue:   "hover:border-blue-300 hover:bg-blue-50",
  orange: "hover:border-orange-300 hover:bg-orange-50",
  purple: "hover:border-purple-300 hover:bg-purple-50",
  sky:    "hover:border-sky-300 hover:bg-sky-50",
  teal:   "hover:border-teal-300 hover:bg-teal-50",
  pink:   "hover:border-pink-300 hover:bg-pink-50",
};

function StepCircle({ n, done }: { n: number; done: boolean }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
        done
          ? "bg-emerald-500 text-white"
          : "bg-gray-200 text-gray-500"
      }`}
    >
      {done ? "✓" : n}
    </div>
  );
}

export default function PedidoRapidoForm({
  guardarPedidoRapidoAction,
  initialNombre = "",
  initialTelefono = "",
}: {
  guardarPedidoRapidoAction: (formData: FormData) => void;
  initialNombre?: string;
  initialTelefono?: string;
}) {
  const clientePreCargado = !!initialNombre && !!initialTelefono;
  const [paso, setPaso] = useState(clientePreCargado ? 2 : 1);
  const [nombre, setNombre] = useState(initialNombre);
  const [telefono, setTelefono] = useState(initialTelefono);

  const [tipo, setTipo]           = useState("");
  const [tipoCustom, setTipoCustom] = useState("");
  const [servicio, setServicio]   = useState("");
  const [cantidad, setCantidad]   = useState(1);
  const [valor, setValor]         = useState(0);
  const [novedades, setNovedades] = useState<string[]>([]);
  const [notaExtra, setNotaExtra] = useState("");
  const [showNovedades, setShowNovedades] = useState(false);

  const [items, setItems]   = useState<ItemPedido[]>([]);
  const [abono, setAbono]   = useState(0);
  const [metodo, setMetodo] = useState("Efectivo");

  const valorInputRef = useRef<HTMLInputElement>(null);

  const tipoFinal = tipo === "__otro__" ? tipoCustom.trim() : tipo;

  const descripcionActual = useMemo(
    () => [...novedades, notaExtra.trim()].filter(Boolean).join(" - "),
    [novedades, notaExtra],
  );

  const steps = {
    tipo:     !!tipoFinal,
    servicio: !!servicio,
    cantidad: cantidad > 0,
    valor:    valor > 0,
  };
  const puedeAgregar = steps.tipo && steps.servicio && steps.cantidad && steps.valor;

  const total        = items.reduce((s, i) => s + i.valor, 0);
  const totalPrendas = items.reduce((s, i) => s + i.cantidad, 0);
  const saldo        = total - abono;

  const valorTotal = cantidad * valor;

  function agregarItem() {
    if (!puedeAgregar) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        tipo: tipoFinal,
        servicio,
        cantidad,
        descripcion: descripcionActual,
        valor: valorTotal,
      },
    ]);
    setServicio("");
    setCantidad(1);
    setValor(0);
    setNovedades([]);
    setNotaExtra("");
    setShowNovedades(false);
  }

  function eliminarItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleNovedad(n: string) {
    setNovedades((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }

  const servicioSeleccionado = SERVICIOS.find((s) => s.nombre === servicio);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
        <form action={guardarPedidoRapidoAction}>
          {/* Hidden fields */}
          <input type="hidden" name="nombre"   value={nombre} />
          <input type="hidden" name="telefono" value={telefono} />
          <input type="hidden" name="abono"    value={abono} />
          <input type="hidden" name="metodo"   value={metodo} />
          {items.map((item) => (
            <div key={item.id}>
              <input type="hidden" name="tipo"        value={item.tipo} />
              <input type="hidden" name="servicio"    value={item.servicio} />
              <input type="hidden" name="cantidad"    value={item.cantidad} />
              <input type="hidden" name="descripcion" value={item.descripcion} />
              <input type="hidden" name="valor"       value={item.valor} />
            </div>
          ))}

          {/* ── HEADER ─────────────────────────────────────────── */}
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-xl shadow-sm">
                🧺
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-brand-500">
                  Pedido rápido
                </p>
                <h1 className="text-xl font-black leading-tight text-gray-900">
                  {paso === 1 ? "¿Quién trae las prendas?" : "Ingresa las prendas"}
                </h1>
              </div>
            </div>

            {paso === 2 && (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2 ring-1 ring-gray-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-600">
                  {nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black leading-tight text-gray-800">{nombre}</p>
                  <p className="text-xs text-gray-400">{telefono}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="ml-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-100"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* ── PASO 1: CLIENTE ─────────────────────────────────── */}
          {paso === 1 && (
            <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-4xl">
                  👤
                </div>
                <h2 className="text-2xl font-black text-gray-900">Datos del cliente</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Ingresa el nombre y teléfono para continuar
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">👤</span>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    className="w-full rounded-2xl border-2 border-gray-200 py-4 pl-12 pr-5 text-xl font-bold placeholder:text-gray-300 focus:border-brand-500 focus:outline-none"
                    placeholder="Nombre completo"
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">📞</span>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (nombre.trim() && telefono.trim()) setPaso(2);
                      }
                    }}
                    type="tel"
                    className="w-full rounded-2xl border-2 border-gray-200 py-4 pl-12 pr-5 text-xl font-bold placeholder:text-gray-300 focus:border-brand-500 focus:outline-none"
                    placeholder="Teléfono"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!nombre.trim() || !telefono.trim()}
                onClick={() => setPaso(2)}
                className="mt-6 w-full rounded-2xl bg-brand-500 py-4 text-lg font-black text-white shadow-md transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                Continuar → Agregar prendas
              </button>
            </div>
          )}

          {/* ── PASO 2: ITEMS + RESUMEN ────────────────────────── */}
          {paso === 2 && (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

              {/* ═══ COLUMNA IZQUIERDA ═══════════════════════════ */}
              <div className="min-w-0 flex-1 space-y-3">

                {/* ─── PASO 1: Tipo de prenda ─── */}
                <div className={`rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                  steps.tipo ? "ring-emerald-200" : "ring-gray-100"
                }`}>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
                    <StepCircle n={1} done={steps.tipo} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-800">Tipo de prenda</p>
                      {steps.tipo && (
                        <p className="text-xs font-bold text-emerald-600">
                          Seleccionado: {tipoFinal}
                        </p>
                      )}
                    </div>
                    {steps.tipo && !steps.servicio && (
                      <span className="animate-pulse rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-black text-brand-600">
                        siguiente →
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                      {PRENDAS.map((p) => (
                        <button
                          key={p.nombre}
                          type="button"
                          onClick={() => { setTipo(p.nombre); setTipoCustom(""); }}
                          className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition active:scale-[0.96] ${
                            tipo === p.nombre
                              ? "border-brand-500 bg-brand-500 text-white shadow-md"
                              : "border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50"
                          }`}
                        >
                          <span className="text-2xl leading-none">{p.emoji}</span>
                          <span className="text-xs font-black leading-tight">{p.nombre}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTipo("__otro__")}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition active:scale-[0.96] ${
                          tipo === "__otro__"
                            ? "border-brand-500 bg-brand-500 text-white shadow-md"
                            : "border-dashed border-gray-300 bg-white text-gray-500 hover:border-brand-300"
                        }`}
                      >
                        <span className="text-2xl leading-none">✏️</span>
                        <span className="text-xs font-black leading-tight">Otro</span>
                      </button>
                    </div>
                    {tipo === "__otro__" && (
                      <input
                        value={tipoCustom}
                        onChange={(e) => setTipoCustom(e.target.value)}
                        autoFocus
                        className="mt-3 w-full rounded-xl border-2 border-brand-300 p-3 text-base font-bold focus:border-brand-500 focus:outline-none"
                        placeholder="Ej: Cortinas, Mantel, Edredón…"
                      />
                    )}
                  </div>
                </div>

                {/* ─── PASO 2: Servicio ─── */}
                <div className={`rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                  steps.servicio ? "ring-emerald-200" : "ring-gray-100"
                }`}>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
                    <StepCircle n={2} done={steps.servicio} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-800">Servicio</p>
                      {steps.servicio && (
                        <p className="text-xs font-bold text-emerald-600">
                          {servicioSeleccionado?.emoji} {servicio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {SERVICIOS.map((s) => (
                        <button
                          key={s.nombre}
                          type="button"
                          onClick={() => setServicio(s.nombre)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition active:scale-[0.97] ${
                            servicio === s.nombre
                              ? SERVICIO_COLORS[s.color]
                              : `border-gray-200 bg-white text-gray-700 ${SERVICIO_COLORS_IDLE[s.color]}`
                          }`}
                        >
                          <span className="text-2xl leading-none">{s.emoji}</span>
                          <span className="text-xs font-black leading-tight">{s.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ─── PASOS 3 y 4: Cantidad + Valor ─── */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Cantidad */}
                  <div className={`rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                    steps.cantidad ? "ring-emerald-200" : "ring-gray-100"
                  }`}>
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
                      <StepCircle n={3} done={steps.cantidad} />
                      <p className="text-sm font-black text-gray-800">Cantidad</p>
                    </div>
                    <div className="p-4">
                      {/* Accesos rápidos */}
                      <div className="mb-3 grid grid-cols-4 gap-1.5">
                        {CANT_RAPIDAS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCantidad(c)}
                            className={`rounded-lg border-2 py-1.5 text-sm font-black transition active:scale-[0.96] ${
                              cantidad === c
                                ? "border-brand-500 bg-brand-500 text-white"
                                : "border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      {/* Spinner manual */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl font-black text-gray-700 transition hover:bg-gray-200 active:scale-95"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={cantidad}
                          onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); if (puedeAgregar) agregarItem(); }
                          }}
                          className="w-full rounded-xl border-2 border-gray-200 py-2 text-center text-2xl font-black focus:border-brand-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setCantidad((c) => c + 1)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-xl font-black text-white transition hover:bg-brand-600 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className={`rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                    steps.valor ? "ring-emerald-200" : "ring-gray-100"
                  }`}>
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
                      <StepCircle n={4} done={steps.valor} />
                      <div className="flex-1">
                        <p className="text-sm font-black text-gray-800">Valor unitario</p>
                        {steps.valor && (
                          <p className="text-xs font-bold text-emerald-600">
                            {money(valor)} c/u
                          </p>
                        )}
                      </div>
                      {steps.valor && cantidad > 1 && (
                        <span className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-black text-brand-600">
                          {cantidad} × {money(valor)} = {money(valorTotal)}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-3 grid grid-cols-4 gap-1.5">
                        {VALORES_RAPIDOS.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setValor(v)}
                            className={`rounded-lg border-2 py-1.5 text-xs font-black transition active:scale-[0.96] ${
                              valor === v
                                ? "border-brand-500 bg-brand-500 text-white"
                                : "border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50"
                            }`}
                          >
                            {money(v)}
                          </button>
                        ))}
                      </div>
                      <input
                        ref={valorInputRef}
                        type="number"
                        value={valor || ""}
                        onChange={(e) => setValor(Number(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); if (puedeAgregar) agregarItem(); }
                        }}
                        className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-base font-bold placeholder:text-gray-300 focus:border-brand-500 focus:outline-none"
                        placeholder="Valor por unidad…"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── Novedades (colapsable) ─── */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowNovedades((v) => !v)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
                  >
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-600">Novedades de la prenda</p>
                      <p className="text-xs text-gray-400">
                        {descripcionActual
                          ? descripcionActual
                          : "Daños, manchas, estado especial · Opcional"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold transition-transform ${showNovedades ? "rotate-180" : ""} text-gray-400`}>
                      ▼
                    </span>
                  </button>

                  {showNovedades && (
                    <div className="border-t border-gray-100 p-4">
                      <div className="grid grid-cols-4 gap-2">
                        {NOVEDADES.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => toggleNovedad(n)}
                            className={`rounded-xl border-2 p-2 text-xs font-bold transition active:scale-[0.97] ${
                              novedades.includes(n)
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-gray-200 text-gray-600 hover:border-orange-300"
                            }`}
                          >
                            {novedades.includes(n) ? "⚠️ " : ""}{n}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={notaExtra}
                        onChange={(e) => setNotaExtra(e.target.value)}
                        rows={2}
                        className="mt-3 w-full rounded-xl border-2 border-gray-200 p-3 text-sm placeholder:text-gray-300 focus:border-brand-500 focus:outline-none"
                        placeholder="Nota adicional…"
                      />
                    </div>
                  )}
                </div>

                {/* ─── Botón AGREGAR ─── */}
                <button
                  type="button"
                  onClick={agregarItem}
                  disabled={!puedeAgregar}
                  className={`w-full rounded-2xl py-4 text-base font-black shadow-md transition active:scale-[0.99] ${
                    puedeAgregar
                      ? "bg-gray-900 text-white hover:bg-gray-700"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                  }`}
                >
                  {puedeAgregar ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-lg">➕</span>
                      <span>
                        Agregar {cantidad > 1 ? `${cantidad}× ` : ""}{tipoFinal}
                        <span className="mx-1.5 opacity-50">·</span>
                        {servicio}
                        <span className="mx-1.5 opacity-50">·</span>
                        {cantidad > 1 ? (
                          <>{cantidad} × {money(valor)} = <strong>{money(valorTotal)}</strong></>
                        ) : (
                          money(valor)
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Completa los 4 pasos para agregar la prenda</span>
                      {!steps.tipo && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">① Tipo</span>}
                      {steps.tipo && !steps.servicio && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">② Servicio</span>}
                      {steps.tipo && steps.servicio && !steps.valor && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">④ Valor</span>}
                    </span>
                  )}
                </button>
              </div>

              {/* ═══ COLUMNA DERECHA: Pedido en curso ════════════ */}
              <div className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">

                  {/* Header del panel */}
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧾</span>
                      <p className="text-sm font-black text-gray-700">Pedido</p>
                    </div>
                    {totalPrendas > 0 && (
                      <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-black text-white">
                        {totalPrendas} {totalPrendas === 1 ? "prenda" : "prendas"}
                      </span>
                    )}
                  </div>

                  {/* Lista de ítems */}
                  {items.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <p className="text-3xl">📋</p>
                      <p className="mt-2 text-sm font-bold text-gray-300">Sin prendas aún</p>
                      <p className="text-xs text-gray-300">Completa los 4 pasos y presiona Agregar</p>
                    </div>
                  ) : (
                    <div className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
                      {items.map((item, idx) => (
                        <div key={item.id} className="flex items-start gap-2 px-4 py-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-black text-gray-500">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black leading-tight text-gray-900">
                              {item.cantidad > 1 && (
                                <span className="mr-1 font-black text-brand-500">{item.cantidad}×</span>
                              )}
                              {item.tipo}
                            </p>
                            <p className="text-xs font-semibold text-gray-400">{item.servicio}</p>
                            {item.descripcion && (
                              <p className="mt-0.5 text-xs font-bold leading-tight text-orange-500">
                                ⚠ {item.descripcion}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-brand-500">{money(item.valor)}</p>
                            <button
                              type="button"
                              onClick={() => eliminarItem(item.id)}
                              className="mt-0.5 text-xs font-bold text-red-300 transition hover:text-red-500"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total + pago + confirmar */}
                  {items.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 bg-brand-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-wide text-brand-600">Total</p>
                          <p className="text-2xl font-black text-brand-700">{money(total)}</p>
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">
                            💵 Abono inicial
                          </label>
                          <input
                            type="number"
                            value={abono || ""}
                            onChange={(e) => setAbono(Number(e.target.value) || 0)}
                            className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-xl font-black focus:border-brand-500 focus:outline-none"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">
                            Método de pago
                          </label>
                          <select
                            value={metodo}
                            onChange={(e) => setMetodo(e.target.value)}
                            className="w-full rounded-xl border-2 border-gray-200 p-2.5 text-sm font-black focus:border-brand-500 focus:outline-none"
                          >
                            <option value="Efectivo">💵 Efectivo</option>
                            <option value="Nequi">📱 Nequi</option>
                            <option value="Daviplata">📱 Daviplata</option>
                            <option value="Transferencia">🏦 Transferencia</option>
                            <option value="Tarjeta">💳 Tarjeta</option>
                          </select>
                        </div>

                        {saldo > 0 && abono > 0 && (
                          <div className="rounded-xl bg-red-50 px-3 py-2 text-center">
                            <p className="text-xs font-bold uppercase text-red-400">Saldo pendiente</p>
                            <p className="text-lg font-black text-red-600">{money(saldo)}</p>
                          </div>
                        )}
                        {saldo <= 0 && abono > 0 && (
                          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                            <p className="text-xs font-bold text-emerald-600">✅ Pagado completo</p>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-brand-600 active:scale-[0.99]"
                        >
                          ✅ Confirmar e imprimir recibo
                        </button>
                      </div>
                    </>
                  )}

                  {items.length === 0 && (
                    <div className="p-4">
                      <button
                        type="submit"
                        disabled
                        className="w-full cursor-not-allowed rounded-2xl bg-gray-100 py-3.5 text-sm font-black text-gray-300"
                      >
                        Confirmar e imprimir recibo
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </form>
      </div>
    </main>
  );
}
