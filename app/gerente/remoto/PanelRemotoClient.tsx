"use client";

import { useCallback, useEffect, useState } from "react";
import { money, fmt } from "@/lib/format";
import { guardarCacheRemoto, leerCacheRemoto, etiquetaUltimaActualizacion } from "@/lib/remote-cache";
import {
  traerPanelRemotoDeFirestore,
  claveCachePanelRemoto,
  fechaHoy,
  type PanelRemotoData,
  type MovimientoRemoto,
} from "@/lib/panel-remoto";

export default function PanelRemotoClient() {
  const [datos, setDatos] = useState<PanelRemotoData | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<number | null>(null);
  const [esCache, setEsCache] = useState(false);
  const [sinDatosHoy, setSinDatosHoy] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const fecha = fechaHoy();
    const clave = claveCachePanelRemoto(fecha);

    try {
      const frescos = await traerPanelRemotoDeFirestore(fecha);

      if (frescos === null) {
        // Con conexión real, pero todavía no hay cierre registrado hoy —
        // no es un fallo, es el estado normal de un día que apenas empieza.
        setDatos(null);
        setActualizadoEn(null);
        setEsCache(false);
        setSinDatosHoy(true);
        setError(null);
        return;
      }

      setDatos(frescos);
      setActualizadoEn(Date.now());
      setEsCache(false);
      setSinDatosHoy(false);
      setError(null);
      await guardarCacheRemoto(clave, frescos);
    } catch {
      const cache = await leerCacheRemoto<PanelRemotoData>(clave);

      if (cache) {
        setDatos(cache.datos);
        setActualizadoEn(cache.actualizadoEn);
        setEsCache(true);
        setSinDatosHoy(false);
        setError(null);
      } else {
        setError("Sin conexión y no hay datos guardados todavía para hoy.");
      }
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    cargar().finally(() => {
      if (!cancelado) setCargando(false);
    });

    return () => {
      cancelado = true;
    };
  }, [cargar]);

  async function handleActualizar() {
    setActualizando(true);
    await cargar();
    setActualizando(false);
  }

  if (cargando) {
    return (
      <div className="p-6">
        <p className="text-sm font-semibold text-gray-400">Cargando panel remoto…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 text-center">
          <p className="font-bold text-gray-900">No se pudo cargar el panel</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const estado: EstadoPanel = sinDatosHoy ? "sin-datos" : esCache ? "cache" : "fresco";

  return (
    <div className="space-y-5 p-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Gerente</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">Panel remoto</h1>
            <p className="mt-1 text-sm text-gray-500">
              Solo lectura · movimientos del día y último cierre de caja, desde cualquier lugar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EstadoBadge estado={estado} actualizadoEn={actualizadoEn} />
            <button
              type="button"
              onClick={handleActualizar}
              disabled={actualizando}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className={`h-3.5 w-3.5 ${actualizando ? "animate-spin" : ""}`}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {actualizando ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {sinDatosHoy || !datos ? (
        <div className="card p-6 text-center">
          <p className="font-bold text-gray-900">Sin cierre registrado hoy todavía</p>
          <p className="mt-1 text-sm text-gray-500">
            Apenas se haga el primer cierre de caja del día va a aparecer acá.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <MovSection title="Entradas del día" count={datos.entradas.length} color="blue" movimientos={datos.entradas} />
            <MovSection title="Salidas del día" count={datos.salidas.length} color="green" movimientos={datos.salidas} />
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-lg font-black text-gray-900">Último cierre de caja</h2>
            {datos.cierre ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
                <p className="font-black text-gray-900">Cierre #{fmt(datos.cierre.id)}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(datos.cierre.createdAt).toLocaleString("es-CO")} · {datos.cierre.responsable || "Sin responsable"}
                </p>
                <p className="mt-2 text-lg font-black text-brand-500">Total caja: {money(datos.cierre.totalCaja)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <Dato label="Efectivo" valor={datos.cierre.efectivo} />
                  <Dato label="Nequi" valor={datos.cierre.nequi} />
                  <Dato label="Daviplata" valor={datos.cierre.daviplata} />
                  <Dato label="Transferencia" valor={datos.cierre.transferencia} />
                  <Dato label="Tarjeta" valor={datos.cierre.tarjeta} />
                  <Dato label="Gastos" valor={-datos.cierre.gastos} />
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
                No hay cierres registrados este día.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type EstadoPanel = "fresco" | "cache" | "sin-datos";

function EstadoBadge({ estado, actualizadoEn }: { estado: EstadoPanel; actualizadoEn: number | null }) {
  if (estado === "sin-datos") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Sin cierre registrado hoy todavía
      </div>
    );
  }

  if (!actualizadoEn) return null;

  const texto = etiquetaUltimaActualizacion(actualizadoEn);

  if (estado === "cache") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.7 3.86a2 2 0 0 0-3.4 0Z" />
        </svg>
        Sin conexión · Última actualización: {texto}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Última actualización: {texto}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-black ${valor < 0 ? "text-red-500" : "text-gray-900"}`}>{money(valor)}</p>
    </div>
  );
}

function MovSection({
  title, count, color, movimientos,
}: {
  title: string; count: number; color: "blue" | "green"; movimientos: MovimientoRemoto[];
}) {
  const badge = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  }[color];

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black text-gray-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{count}</span>
      </div>
      <div className="space-y-3">
        {movimientos.map((m) => (
          <div key={`${m.pedidoId}-${m.hora}`} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3.5 dark:border-white/[0.07]">
            <div>
              <p className="font-bold text-gray-900">#{fmt(m.pedidoId)} · {m.cliente}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {money(m.total)} · {new Date(m.hora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className="shrink-0 font-black text-brand-500">{money(m.abonado)}</span>
          </div>
        ))}
        {movimientos.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
            No hay movimientos registrados.
          </p>
        )}
      </div>
    </div>
  );
}
