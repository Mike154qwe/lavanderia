"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

export type PedidoEntrega = {
  id: number;
  codigoFormateado: string;
  estado: string;
  fechaFormateada: string;
  cliente: { nombre: string; telefono: string };
  prendas: Array<{
    tipo: string;
    servicio: string;
    cantidad: number;
    valor: number;
    descripcion: string | null;
  }>;
  total: number;
  abonado: number;
  saldo: number;
};

type Status = "idle" | "loading" | "found" | "not-found" | "success-entrega" | "success-pago";

const ESTADO_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  RECIBIDO:   { bg: "bg-blue-50",   text: "text-blue-700",  dot: "bg-blue-400",  label: "Recibido"   },
  EN_PROCESO: { bg: "bg-yellow-50", text: "text-yellow-700",dot: "bg-yellow-400",label: "En proceso" },
  LISTO:      { bg: "bg-emerald-50",text: "text-emerald-700",dot:"bg-emerald-400",label: "Listo ✓"   },
  ENTREGADO:  { bg: "bg-gray-50",   text: "text-gray-500",  dot: "bg-gray-400",  label: "Entregado"  },
  CANCELADO:  { bg: "bg-red-50",    text: "text-red-600",   dot: "bg-red-400",   label: "Cancelado"  },
};

const METODOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"];

export default function EntregaClient({
  buscarPedidoAction,
  marcarEntregadoAction,
  registrarPagoAction,
}: {
  buscarPedidoAction: (codigo: string) => Promise<PedidoEntrega | null>;
  marcarEntregadoAction: (id: number) => Promise<void>;
  registrarPagoAction: (id: number, valor: number, metodo: string) => Promise<void>;
}) {
  const [codigo, setCodigo]     = useState("");
  const [status, setStatus]     = useState<Status>("idle");
  const [pedido, setPedido]     = useState<PedidoEntrega | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [showPago, setShowPago] = useState(false);
  const [pagoValor, setPagoValor] = useState(0);
  const [pagoMetodo, setPagoMetodo] = useState("Efectivo");

  const inputRef = useRef<HTMLInputElement>(null);

  // Siempre enfocar el input
  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  function reset() {
    setCodigo("");
    setStatus("idle");
    setPedido(null);
    setShowPago(false);
    setPagoValor(0);
    setPagoMetodo("Efectivo");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleBuscar() {
    const q = codigo.trim();
    if (!q) return;
    setStatus("loading");
    setIsPending(true);
    try {
      const result = await buscarPedidoAction(q);
      if (result) {
        setPedido(result);
        setPagoValor(result.saldo);
        setStatus("found");
      } else {
        setPedido(null);
        setStatus("not-found");
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleEntrega() {
    if (!pedido) return;
    setIsPending(true);
    try {
      await marcarEntregadoAction(pedido.id);
      setStatus("success-entrega");
      setTimeout(reset, 2200);
    } finally {
      setIsPending(false);
    }
  }

  async function handlePago() {
    if (!pedido || pagoValor <= 0) return;
    setIsPending(true);
    try {
      await registrarPagoAction(pedido.id, pagoValor, pagoMetodo);
      // Recargar el pedido para mostrar saldo actualizado
      const updated = await buscarPedidoAction(pedido.codigoFormateado);
      if (updated) {
        setPedido(updated);
        setPagoValor(updated.saldo);
      }
      setShowPago(false);
      setStatus("success-pago");
      setTimeout(() => setStatus("found"), 1800);
    } finally {
      setIsPending(false);
    }
  }

  const estadoInfo = pedido ? (ESTADO_STYLE[pedido.estado] ?? ESTADO_STYLE["RECIBIDO"]) : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-6">

        {/* ── HEADER ────────────────────────────────── */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-3xl shadow-lg">
            🔫
          </div>
          <h1 className="text-2xl font-black text-gray-900">Entrega y cobro</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Escanea el recibo del cliente para continuar
          </p>
        </div>

        {/* ── INPUT ESCANEO ─────────────────────────── */}
        <div className={`mb-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-2 transition-all ${
          status === "loading" ? "ring-brand-300 animate-pulse" : "ring-brand-500"
        }`}>
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="text-2xl">{status === "loading" ? "⏳" : "🔍"}</span>
            <input
              ref={inputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleBuscar(); }
              }}
              disabled={isPending}
              className="flex-1 text-2xl font-black tracking-widest placeholder:text-gray-200 focus:outline-none disabled:opacity-50"
              placeholder="00000"
              autoComplete="off"
              inputMode="numeric"
            />
            {codigo && (
              <button
                type="button"
                onClick={reset}
                className="text-gray-300 transition hover:text-gray-500"
              >
                ✕
              </button>
            )}
          </div>
          <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-400">
            Escanea el código de barras o escribe el número · presiona Enter
          </div>
        </div>

        {/* ── NOT FOUND ─────────────────────────────── */}
        {status === "not-found" && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-red-50 px-5 py-4 ring-1 ring-red-200">
            <span className="text-3xl">❌</span>
            <div>
              <p className="font-black text-red-700">Recibo no encontrado</p>
              <p className="text-sm text-red-400">
                No existe el pedido <strong>{codigo}</strong>. Verifica el número.
              </p>
            </div>
          </div>
        )}

        {/* ── SUCCESS ENTREGADO ─────────────────────── */}
        {status === "success-entrega" && pedido && (
          <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 px-5 py-8 text-center ring-1 ring-emerald-200">
            <span className="text-5xl">✅</span>
            <p className="text-xl font-black text-emerald-700">¡Entregado!</p>
            <p className="text-sm font-bold text-emerald-600">
              Pedido #{pedido.codigoFormateado} — {pedido.cliente.nombre}
            </p>
            <p className="text-xs text-emerald-400">Listo para el siguiente cliente…</p>
          </div>
        )}

        {/* ── SUCCESS PAGO ──────────────────────────── */}
        {status === "success-pago" && pedido && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3 ring-1 ring-emerald-200">
            <span className="text-2xl">💰</span>
            <p className="font-black text-emerald-700">Pago registrado correctamente</p>
          </div>
        )}

        {/* ── PEDIDO ENCONTRADO ─────────────────────── */}
        {(status === "found" || status === "success-pago") && pedido && estadoInfo && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">

            {/* Encabezado del pedido */}
            <div className={`flex items-center justify-between px-5 py-4 ${estadoInfo.bg}`}>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Pedido
                </p>
                <p className="text-2xl font-black text-gray-900">
                  #{pedido.codigoFormateado}
                </p>
                <p className="text-xs text-gray-400">{pedido.fechaFormateada}</p>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${estadoInfo.bg} ring-1 ring-current/20`}>
                <span className={`h-2 w-2 rounded-full ${estadoInfo.dot}`} />
                <span className={`text-sm font-black ${estadoInfo.text}`}>
                  {estadoInfo.label}
                </span>
              </div>
            </div>

            {/* Aviso si no está listo */}
            {(pedido.estado === "RECIBIDO" || pedido.estado === "EN_PROCESO") && (
              <div className="flex items-center gap-2 border-b border-yellow-100 bg-yellow-50 px-5 py-2.5">
                <span>⚠️</span>
                <p className="text-xs font-black text-yellow-700">
                  Este pedido aún no está listo para entrega
                </p>
              </div>
            )}

            {/* Aviso si ya fue entregado */}
            {pedido.estado === "ENTREGADO" && (
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-2.5">
                <span>ℹ️</span>
                <p className="text-xs font-bold text-gray-500">
                  Este pedido ya fue marcado como entregado
                </p>
              </div>
            )}

            {/* Cliente */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-black text-brand-600">
                {pedido.cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-gray-900">{pedido.cliente.nombre}</p>
                <p className="text-sm text-gray-400">📞 {pedido.cliente.telefono || "Sin teléfono"}</p>
              </div>
            </div>

            {/* Prendas */}
            <div className="border-b border-gray-100">
              <p className="px-5 pt-3 text-xs font-black uppercase tracking-widest text-gray-400">
                Prendas
              </p>
              <div className="divide-y divide-gray-50 pb-1">
                {pedido.prendas.map((p, i) => (
                  <div key={i} className="flex items-start justify-between px-5 py-2.5">
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-900">
                        {p.cantidad > 1 && (
                          <span className="mr-1 font-black text-brand-500">{p.cantidad}×</span>
                        )}
                        {p.tipo}
                      </p>
                      <p className="text-xs text-gray-400">{p.servicio}</p>
                      {p.descripcion && (
                        <p className="mt-0.5 text-xs font-bold text-orange-500">⚠ {p.descripcion}</p>
                      )}
                    </div>
                    <p className="text-sm font-black text-gray-700">{money(p.valor)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="border-b border-gray-100 px-5 py-3">
              <div className="flex justify-between py-1 text-sm text-gray-500">
                <span>Total</span>
                <span className="font-bold text-gray-800">{money(pedido.total)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm text-gray-500">
                <span>Abonado</span>
                <span className="font-bold text-emerald-600">{money(pedido.abonado)}</span>
              </div>
              {pedido.saldo > 0 ? (
                <div className="mt-1 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 ring-1 ring-red-200">
                  <span className="font-black text-red-600">Saldo pendiente</span>
                  <span className="text-xl font-black text-red-600">{money(pedido.saldo)}</span>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
                  <span className="font-black text-emerald-600">✅ Pagado completo</span>
                  <span className="font-black text-emerald-600">{money(pedido.total)}</span>
                </div>
              )}
            </div>

            {/* Formulario de cobro (expandible) */}
            {showPago && (
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                <p className="mb-3 text-sm font-black text-gray-700">💰 Registrar cobro</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                      Valor a cobrar
                    </label>
                    <input
                      type="number"
                      value={pagoValor || ""}
                      onChange={(e) => setPagoValor(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border-2 border-gray-200 p-3 text-xl font-black focus:border-brand-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                      Método
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {METODOS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPagoMetodo(m)}
                          className={`rounded-xl border-2 py-2 text-xs font-black transition ${
                            pagoMetodo === m
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-200 text-gray-600 hover:border-brand-300"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPago(false)}
                      className="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-black text-gray-500 transition hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handlePago}
                      disabled={isPending || pagoValor <= 0}
                      className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
                    >
                      {isPending ? "Guardando…" : `Confirmar ${money(pagoValor)}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            {pedido.estado !== "ENTREGADO" && pedido.estado !== "CANCELADO" && (
              <div className="flex gap-3 p-4">
                {pedido.saldo > 0 && !showPago && (
                  <button
                    type="button"
                    onClick={() => { setShowPago(true); setPagoValor(pedido.saldo); }}
                    disabled={isPending}
                    className="flex-1 rounded-xl bg-gray-900 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-gray-700 disabled:opacity-50"
                  >
                    💰 Cobrar {money(pedido.saldo)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleEntrega}
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-brand-500 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "✅ Marcar entregado"}
                </button>
              </div>
            )}

            {/* Ya entregado — solo botón nuevo escaneo */}
            {(pedido.estado === "ENTREGADO" || pedido.estado === "CANCELADO") && (
              <div className="p-4">
                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 text-sm font-black text-gray-500 transition hover:bg-gray-50"
                >
                  🔍 Escanear otro recibo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ESTADO IDLE ───────────────────────────── */}
        {status === "idle" && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-gray-200 px-6 py-10 text-center">
            <p className="text-4xl">📄</p>
            <p className="mt-3 font-black text-gray-300">Esperando escaneo</p>
            <p className="mt-1 text-xs text-gray-200">
              Apunta la pistola al código de barras del recibo
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
