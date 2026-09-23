import { money, fmt } from "@/lib/format";
import type { PanelRemotoData } from "@/lib/panel-remoto";

// El número que la gerente de verdad viene a buscar: ganancia neta y
// efectivo en caja del día seleccionado (el más reciente por defecto), en
// grande, con el día al lado -- no otra tarjeta más del mismo tamaño que las
// demás. Mismo azul/verde que la gráfica: "ganancia neta" y "efectivo en
// caja" son SIEMPRE esos dos colores en todo el panel, nunca otro.
export default function HeroCierre({
  datos,
  esElMasReciente,
}: {
  datos: PanelRemotoData;
  esElMasReciente: boolean;
}) {
  const cierre = datos.cierre;
  // toLocaleDateString devuelve "martes, 22 de septiembre" todo en minúscula
  // -- la clase de Tailwind "capitalize" mayusculiza CADA palabra (también el
  // conector "de"), así que esto se hace a mano: solo la primera letra.
  const fechaCruda = new Date(datos.fecha + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const fechaLegible = fechaCruda.charAt(0).toUpperCase() + fechaCruda.slice(1);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-6 py-3.5 dark:border-white/[0.07]">
        <p className="text-sm font-semibold text-gray-500">{fechaLegible}</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
            esElMasReciente
              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
              : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
          }`}
        >
          {esElMasReciente ? "Día más reciente" : "Día seleccionado"}
        </span>
      </div>

      {cierre ? (
        <div className="grid divide-y divide-gray-100 dark:divide-white/[0.07] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <HeroNumero
            label="Ganancia neta"
            hint="Todo lo recibido menos todos los gastos"
            valor={cierre.totalCaja}
            colorPositivo="text-brand-500"
          />
          <HeroNumero
            label="Efectivo en caja"
            hint="Para cuadrar el cajón físico"
            valor={cierre.efectivoEnCaja}
            colorPositivo="text-[#12b76a] dark:text-[#3fd694]"
            sinDato={cierre.efectivoEnCaja === undefined}
          />
        </div>
      ) : (
        <p className="px-6 py-10 text-center text-sm font-semibold text-gray-400">
          No hay cierre registrado este día.
        </p>
      )}

      {cierre && (
        <p className="border-t border-gray-100 px-6 py-2.5 text-xs text-gray-400 dark:border-white/[0.07]">
          Cierre #{fmt(cierre.id)} · {cierre.responsable || "Sin responsable"}
        </p>
      )}
    </div>
  );
}

function HeroNumero({
  label,
  hint,
  valor,
  colorPositivo,
  sinDato,
}: {
  label: string;
  hint: string;
  valor: number | undefined;
  colorPositivo: string;
  sinDato?: boolean;
}) {
  if (sinDato || valor === undefined) {
    return (
      <div className="p-6">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-gray-300 dark:text-white/20">—</p>
        <p className="mt-1 text-xs text-gray-400">Este cierre no tiene este dato todavía.</p>
      </div>
    );
  }

  const negativo = valor < 0;

  return (
    <div className="p-6">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className={`mt-1 text-[40px] font-black leading-none tracking-tight ${negativo ? "text-red-500" : colorPositivo}`}>
        {money(valor)}
      </p>
      <p className="mt-2 text-xs text-gray-400">{hint}</p>
    </div>
  );
}
