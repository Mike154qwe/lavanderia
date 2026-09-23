"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { money, fmt } from "@/lib/format";
import { guardarCacheRemoto, leerCacheRemoto, etiquetaUltimaActualizacion } from "@/lib/remote-cache";
import {
  traerHistorialPanelRemoto,
  CLAVE_CACHE_HISTORIAL,
  type PanelRemotoData,
} from "@/lib/panel-remoto";
import HeroCierre from "@/components/HeroCierre";
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
  const heroRef = useRef<HTMLDivElement>(null);

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

  function seleccionarDia(fecha: string) {
    setDiaSeleccionado(fecha);
    // El número grande de arriba (HeroCierre) es lo que cambia al elegir un
    // día en la tabla, que queda más abajo -- sin este scroll, en el celular
    // el clic no parece hacer nada visible sin desplazarse a mano.
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const diasConCierre = dias.filter((d) => d.cierre);
  const gananciaAcumulada = diasConCierre.reduce((s, d) => s + (d.cierre?.totalCaja ?? 0), 0);
  const promedioDiario = diasConCierre.length > 0 ? gananciaAcumulada / diasConCierre.length : 0;
  const masReciente = diasConCierre[0]; // dias ya viene ordenado desc por fecha

  const tendencia: PuntoTendencia[] = [...diasConCierre]
    .reverse() // el gráfico va de más antiguo a más reciente, izquierda a derecha
    .map((d) => ({
      fecha: d.fecha.slice(5), // MM-DD, más compacto en el eje
      gananciaNeta: d.cierre?.totalCaja ?? 0,
      efectivoEnCaja: d.cierre?.efectivoEnCaja ?? 0,
    }));

  const seleccionado = dias.find((d) => d.fecha === diaSeleccionado) ?? masReciente ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      {/* Encabezado + estado de conexión */}
      <div className="card flex flex-wrap items-start justify-between gap-3 p-6">
        <div>
          <p className="page-kicker">Gerente</p>
          <h1 className="page-title">Panel remoto</h1>
          <p className="page-subtitle">Tendencia e historial de cierres de caja, desde cualquier lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <EstadoIndicador estado={estado} actualizadoEn={actualizadoEn} />
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

      {diasConCierre.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-bold text-gray-900 dark:text-white">Todavía no hay ningún cierre registrado</p>
          <p className="mt-1 text-sm text-gray-500">Apenas se haga el primer cierre de caja va a aparecer acá.</p>
        </div>
      ) : (
        <>
          {/* El número que la gerente viene a buscar: grande, primero, con el
              día al lado -- no una tarjeta más del mismo tamaño que las demás. */}
          <div ref={heroRef}>
            {seleccionado && <HeroCierre datos={seleccionado} esElMasReciente={seleccionado.fecha === masReciente.fecha} />}
          </div>

          {/* Contexto de apoyo -- a propósito más chico que el hero de arriba. */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="Ganancia neta acumulada"
              value={money(gananciaAcumulada)}
              tono="ganancia"
              danger={gananciaAcumulada < 0}
              hint={`${diasConCierre.length} día${diasConCierre.length === 1 ? "" : "s"} con cierre`}
            />
            <KpiCard label="Días con cierre" value={String(diasConCierre.length)} tono="neutro" hint="Desde que se activó la sincronización" />
            <KpiCard
              label="Promedio diario"
              value={money(Math.round(promedioDiario))}
              tono="ganancia"
              danger={promedioDiario < 0}
              hint="Ganancia neta / días con cierre"
            />
          </div>

          {/* Tendencia -- con pocos puntos (recién empieza el historial), el
              mensaje de abajo dice explícitamente que crece con cada cierre,
              para que no se vea como una gráfica vacía o rota. */}
          <div className="card p-6">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="title-lg">Tendencia</h2>
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

          {/* Historial de días -- tabla de datos de verdad: columnas numéricas
              alineadas a la derecha, no tarjetas sueltas. Tocar una fila
              selecciona ese día (arriba y en el detalle de abajo). */}
          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
              <h2 className="title-lg">Historial de días</h2>
              <p className="mt-0.5 text-xs text-gray-400">Toca un día para ver el detalle</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Ganancia neta</th>
                    <th className="text-right">Efectivo en caja</th>
                    <th className="hidden text-right sm:table-cell">Entradas</th>
                    <th className="hidden text-right sm:table-cell">Salidas</th>
                  </tr>
                </thead>
                <tbody>
                  {diasConCierre.map((d) => {
                    const activo = seleccionado?.fecha === d.fecha;
                    const neta = d.cierre?.totalCaja ?? 0;
                    const efectivo = d.cierre?.efectivoEnCaja;
                    return (
                      <tr
                        key={d.fecha}
                        onClick={() => seleccionarDia(d.fecha)}
                        className={`cursor-pointer ${activo ? "bg-brand-50/70 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"}`}
                      >
                        <td className="font-semibold text-gray-900 dark:text-white">{d.fecha}</td>
                        <td className={`text-right font-bold tabular-nums ${neta < 0 ? "text-red-500" : "text-brand-500"}`}>
                          {money(neta)}
                        </td>
                        <td
                          className={`text-right font-bold tabular-nums ${
                            efectivo === undefined ? "text-gray-300 dark:text-white/20" : efectivo < 0 ? "text-red-500" : "text-[#12b76a] dark:text-[#3fd694]"
                          }`}
                        >
                          {efectivo !== undefined ? money(efectivo) : "—"}
                        </td>
                        <td className="hidden text-right tabular-nums text-gray-500 sm:table-cell">{d.entradas.length}</td>
                        <td className="hidden text-right tabular-nums text-gray-500 sm:table-cell">{d.salidas.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalle del día seleccionado: entradas, salidas y el desglose
              por medio de pago -- los dos números grandes ya se ven arriba en
              el hero, así que no se repiten acá. */}
          {seleccionado && (
            <div>
              <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-gray-400">
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

function EstadoIndicador({ estado, actualizadoEn }: { estado: EstadoPanel; actualizadoEn: number | null }) {
  if (estado === "sin-datos") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-white/10 dark:text-gray-400">
        <span className="status-dot bg-gray-300 dark:bg-white/20" />
        Sin datos todavía
      </div>
    );
  }

  if (!actualizadoEn) return null;
  const texto = etiquetaUltimaActualizacion(actualizadoEn);

  if (estado === "cache") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        <span className="status-dot bg-amber-500" />
        Sin conexión · caché de {texto}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:border-white/10 dark:text-gray-400">
      <span className="status-dot bg-[#12b76a]" />
      Actualizado {texto}
    </div>
  );
}
