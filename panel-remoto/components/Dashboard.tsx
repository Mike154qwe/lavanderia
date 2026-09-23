"use client";

import { useCallback, useEffect, useState } from "react";
import { money, fmt } from "@/lib/format";
import { guardarCacheRemoto, leerCacheRemoto, etiquetaUltimaActualizacion } from "@/lib/remote-cache";
import {
  traerHistorialPanelRemoto,
  CLAVE_CACHE_HISTORIAL,
  type PanelRemotoData,
} from "@/lib/panel-remoto";
import KpiCard from "@/components/KpiCard";
import TrendChart, { type PuntoTendencia } from "@/components/TrendChart";
import DayDetail from "@/components/DayDetail";

// Dashboard de solo lectura: SIN ningún botón de acción, edición o escritura
// -- "Actualizar" solo vuelve a LEER Firestore, no escribe nada. El estado de
// conexión (verde/ámbar/gris) aplica al conjunto de datos completo, no a un
// solo día: ver cargar() más abajo.
type EstadoPanel = "fresco" | "cache" | "sin-datos";

export default function Dashboard() {
  const [dias, setDias] = useState<PanelRemotoData[] | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<number | null>(null);
  const [esCache, setEsCache] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const frescos = await traerHistorialPanelRemoto();
      setDias(frescos);
      setActualizadoEn(Date.now());
      setEsCache(false);
      setError(null);
      await guardarCacheRemoto(CLAVE_CACHE_HISTORIAL, frescos);
    } catch {
      const cache = await leerCacheRemoto<PanelRemotoData[]>(CLAVE_CACHE_HISTORIAL);
      if (cache) {
        setDias(cache.datos);
        setActualizadoEn(cache.actualizadoEn);
        setEsCache(true);
        setError(null);
      } else {
        setDias(null);
        setError("Sin conexión y no hay historial guardado todavía.");
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

  if (error || !dias) {
    return (
      <div className="p-6">
        <div className="card p-6 text-center">
          <p className="font-bold text-gray-900 dark:text-white">No se pudo cargar el panel</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const estado: EstadoPanel = dias.length === 0 ? "sin-datos" : esCache ? "cache" : "fresco";

  // KPIs acumulados sobre TODOS los días con cierre.
  const diasConCierre = dias.filter((d) => d.cierre);
  const gananciaAcumulada = diasConCierre.reduce((s, d) => s + (d.cierre?.totalCaja ?? 0), 0);
  const promedioDiario = diasConCierre.length > 0 ? gananciaAcumulada / diasConCierre.length : 0;
  const masReciente = diasConCierre[0]; // dias ya viene ordenado desc por fecha
  const efectivoMasReciente = masReciente?.cierre?.efectivoEnCaja;

  const tendencia: PuntoTendencia[] = [...diasConCierre]
    .reverse() // el gráfico va de más antiguo a más reciente, izquierda a derecha
    .map((d) => ({
      fecha: d.fecha.slice(5), // MM-DD, más compacto en el eje
      gananciaNeta: d.cierre?.totalCaja ?? 0,
      efectivoEnCaja: d.cierre?.efectivoEnCaja ?? 0,
    }));

  const seleccionado = dias.find((d) => d.fecha === diaSeleccionado) ?? masReciente ?? null;

  return (
    <div className="space-y-5 p-6">
      {/* Encabezado + estado de conexión */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Gerente</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Panel remoto</h1>
            <p className="mt-1 text-sm text-gray-500">
              Solo lectura · tendencias e historial de cierres de caja, desde cualquier lugar.
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${actualizando ? "animate-spin" : ""}`}>
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

      {diasConCierre.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-bold text-gray-900 dark:text-white">Todavía no hay ningún cierre registrado</p>
          <p className="mt-1 text-sm text-gray-500">Apenas se haga el primer cierre de caja va a aparecer acá.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <KpiCard
              label="Ganancia neta acumulada"
              value={money(gananciaAcumulada)}
              color="purple"
              danger={gananciaAcumulada < 0}
              icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              hint="Suma de todos los días con cierre"
            />
            <KpiCard
              label="Efectivo en caja (último día)"
              value={efectivoMasReciente !== undefined ? money(efectivoMasReciente) : "—"}
              color="green"
              danger={(efectivoMasReciente ?? 0) < 0}
              icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              hint={masReciente ? `Al ${masReciente.fecha}` : undefined}
            />
            <KpiCard
              label="Días con cierre"
              value={String(diasConCierre.length)}
              color="blue"
              icon="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
            />
            <KpiCard
              label="Promedio diario"
              value={money(Math.round(promedioDiario))}
              color="red"
              danger={promedioDiario < 0}
              icon="M3 3v18h18M7 14l4-4 4 4 5-6"
              hint="Ganancia neta / días con cierre"
            />
          </div>

          {/* Tendencia -- con pocos puntos (recién empieza el historial), el
              mensaje de abajo dice explícitamente que crece con cada cierre,
              para que no se vea como una gráfica vacía o rota. */}
          <div className="card p-6">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Tendencia</h2>
              {tendencia.length > 0 && tendencia.length < 8 && (
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  Historial reciente
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-gray-400">Ganancia neta y efectivo en caja por día</p>
            {tendencia.length >= 2 ? (
              <>
                <TrendChart data={tendencia} />
                <p className="mt-3 text-center text-xs text-gray-400">
                  {tendencia.length} día{tendencia.length === 1 ? "" : "s"} con cierre desde que se activó la
                  sincronización -- el historial crece con cada cierre nuevo.
                </p>
              </>
            ) : (
              <>
                <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
                  Hace falta más de un día con cierre para trazar una tendencia.
                </p>
                <p className="mt-3 text-center text-xs text-gray-400">
                  Ya va {tendencia.length} de 2 -- el historial crece con cada cierre nuevo.
                </p>
              </>
            )}
          </div>

          {/* Lista de días */}
          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
              <h2 className="font-black text-gray-900 dark:text-white">Historial de días</h2>
              <p className="mt-0.5 text-xs text-gray-400">Toca un día para ver el detalle</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {diasConCierre.map((d) => {
                const activo = seleccionado?.fecha === d.fecha;
                return (
                  <button
                    key={d.fecha}
                    type="button"
                    onClick={() => setDiaSeleccionado(d.fecha)}
                    className={`flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition ${
                      activo ? "bg-brand-50/60 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{d.fecha}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {d.entradas.length} entradas · {d.salidas.length} salidas
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-4 text-right">
                      <div>
                        <p className="text-[11px] text-gray-400">Ganancia neta</p>
                        <p className={`font-black ${(d.cierre?.totalCaja ?? 0) < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                          {money(d.cierre?.totalCaja ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400">Efectivo en caja</p>
                        <p className={`font-black ${(d.cierre?.efectivoEnCaja ?? 0) < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                          {d.cierre?.efectivoEnCaja !== undefined ? money(d.cierre.efectivoEnCaja) : "—"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle del día seleccionado */}
          {seleccionado && (
            <div>
              <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-gray-400">
                Detalle · {seleccionado.fecha}
              </h2>
              <DayDetail datos={seleccionado} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EstadoBadge({ estado, actualizadoEn }: { estado: EstadoPanel; actualizadoEn: number | null }) {
  if (estado === "sin-datos") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Sin datos todavía
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
        Sin conexión · Historial guardado: {texto}
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
