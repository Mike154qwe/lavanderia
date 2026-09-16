"use client";

import { useEffect, useState } from "react";
import { money, fmt } from "@/lib/format";
import { guardarCacheRemoto, leerCacheRemoto } from "@/lib/remote-cache";
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const fecha = fechaHoy();
    const clave = claveCachePanelRemoto(fecha);

    async function cargar() {
      try {
        const frescos = await traerPanelRemotoDeFirestore(fecha);
        if (cancelado) return;

        setDatos(frescos);
        setActualizadoEn(Date.now());
        await guardarCacheRemoto(clave, frescos);
      } catch {
        const cache = await leerCacheRemoto<PanelRemotoData>(clave);
        if (cancelado) return;

        if (cache) {
          setDatos(cache.datos);
          setActualizadoEn(cache.actualizadoEn);
        } else {
          setError("Sin conexión y no hay datos guardados todavía para hoy.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

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

  const { entradas, salidas, cierre } = datos!;

  return (
    <div className="space-y-5 p-6">
      <div className="card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Gerente</p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">Panel remoto</h1>
        <p className="mt-1 text-sm text-gray-500">
          Solo lectura · movimientos del día y último cierre de caja, desde cualquier lugar.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MovSection title="Entradas del día" count={entradas.length} color="blue" movimientos={entradas} />
        <MovSection title="Salidas del día" count={salidas.length} color="green" movimientos={salidas} />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-black text-gray-900">Último cierre de caja</h2>
        {cierre ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <p className="font-black text-gray-900">Cierre #{fmt(cierre.id)}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(cierre.createdAt).toLocaleString("es-CO")} · {cierre.responsable || "Sin responsable"}
            </p>
            <p className="mt-2 text-lg font-black text-brand-500">Total caja: {money(cierre.totalCaja)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Dato label="Efectivo" valor={cierre.efectivo} />
              <Dato label="Nequi" valor={cierre.nequi} />
              <Dato label="Daviplata" valor={cierre.daviplata} />
              <Dato label="Transferencia" valor={cierre.transferencia} />
              <Dato label="Tarjeta" valor={cierre.tarjeta} />
              <Dato label="Gastos" valor={-cierre.gastos} />
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
            No hay cierres registrados este día.
          </p>
        )}
      </div>
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
