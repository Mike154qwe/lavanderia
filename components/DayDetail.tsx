import { money, fmt } from "@/lib/format";
import type { PanelRemotoData, MovimientoRemoto } from "@/lib/panel-remoto";

// Detalle de un día: mismo contenido que ya mostraba el panel remoto viejo
// para "hoy" (entradas, salidas, resumen del cierre) -- reutilizado aquí para
// CUALQUIER día que se seleccione en la lista, no solo el de hoy.
export default function DayDetail({ datos }: { datos: PanelRemotoData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <MovSection title="Entradas del día" count={datos.entradas.length} color="blue" movimientos={datos.entradas} />
        <MovSection title="Salidas del día" count={datos.salidas.length} color="green" movimientos={datos.salidas} />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-black text-gray-900 dark:text-white">Cierre de caja del día</h2>
        {datos.cierre ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <p className="font-black text-gray-900 dark:text-white">Cierre #{fmt(datos.cierre.id)}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(datos.cierre.createdAt).toLocaleString("es-CO")} · {datos.cierre.responsable || "Sin responsable"}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
                <p className="text-xs text-gray-400">Ganancia neta</p>
                <p className={`font-black ${datos.cierre.totalCaja < 0 ? "text-red-500" : "text-brand-500"}`}>
                  {money(datos.cierre.totalCaja)}
                </p>
              </div>
              {datos.cierre.efectivoEnCaja !== undefined && (
                <div className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
                  <p className="text-xs text-gray-400">Efectivo en caja</p>
                  <p className={`font-black ${datos.cierre.efectivoEnCaja < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                    {money(datos.cierre.efectivoEnCaja)}
                  </p>
                </div>
              )}
            </div>

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
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-black ${valor < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{money(valor)}</p>
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
        <h2 className="font-black text-gray-900 dark:text-white">{title}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{count}</span>
      </div>
      <div className="space-y-3">
        {movimientos.map((m) => (
          <div key={`${m.pedidoId}-${m.hora}`} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3.5 dark:border-white/[0.07]">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">#{fmt(m.pedidoId)} · {m.cliente}</p>
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
