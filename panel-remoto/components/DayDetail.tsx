import { money, fmt } from "@/lib/format";
import type { PanelRemotoData, MovimientoRemoto } from "@/lib/panel-remoto";

// Detalle de un día: entradas, salidas y el desglose por medio de pago.
// "Ganancia neta" y "efectivo en caja" YA se ven en grande en HeroCierre.tsx
// para este mismo día -- repetirlos acá sería el mismo número dos veces en
// la misma pantalla, así que este componente no los muestra.
export default function DayDetail({ datos }: { datos: PanelRemotoData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <MovSection title="Entradas del día" count={datos.entradas.length} movimientos={datos.entradas} />
        <MovSection title="Salidas del día" count={datos.salidas.length} movimientos={datos.salidas} />
      </div>

      <div className="card p-6">
        <h2 className="title-lg mb-4">Desglose por medio de pago</h2>
        {datos.cierre ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <p className="font-bold text-gray-900 dark:text-white">Cierre #{fmt(datos.cierre.id)}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(datos.cierre.createdAt).toLocaleString("es-CO")} · {datos.cierre.responsable || "Sin responsable"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
      <p className={`font-bold ${valor < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{money(valor)}</p>
    </div>
  );
}

function MovSection({
  title,
  count,
  movimientos,
}: {
  title: string;
  count: number;
  movimientos: MovimientoRemoto[];
}) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="title-lg">{title}</h2>
        {/* Un conteo simple no tiene una cuenta de dinero detrás -- igual que
            en KpiCard.tsx, queda neutro en vez de tomar prestado un color de
            marca que ya significa otra cosa en el panel. */}
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500 dark:bg-white/5 dark:text-gray-400">
          {count}
        </span>
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
            <span className="shrink-0 font-bold text-brand-500">{money(m.abonado)}</span>
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
