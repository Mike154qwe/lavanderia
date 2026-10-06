import Link from "next/link";
import { civilBogota, sameDay } from "@/lib/format";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type DayStats = {
  entradas?: number;
  salidas?: number;
  gastos?: number;
};

export default function MonthCalendar({
  year,
  month,
  today,
  selected,
  getStats,
  hrefFor,
  showGastos = false,
}: {
  year: number;
  month: number;
  today: Date;
  selected?: Date | null;
  getStats: (day: Date) => DayStats;
  hrefFor: (day: Date) => string;
  showGastos?: boolean;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;

  return (
    <div className="cal-month">
      <div className="cal-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cal-grid">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} className="cal-pad" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dia = i + 1;
          const fecha = civilBogota(year, month, dia);
          const stats = getStats(fecha);
          const entradas = stats.entradas ?? 0;
          const salidas = stats.salidas ?? 0;
          const gastos = stats.gastos ?? 0;
          const activo = entradas > 0 || salidas > 0 || gastos > 0;
          const esHoy = sameDay(fecha, today);
          const esSel = selected ? sameDay(fecha, selected) : false;

          let tone = "cal-cell--idle";
          if (esSel) tone = "cal-cell--selected";
          else if (esHoy) tone = "cal-cell--today";
          else if (activo) tone = "cal-cell--active";

          return (
            <Link
              key={dia}
              id={esHoy ? "hoy" : undefined}
              href={hrefFor(fecha)}
              className={`cal-cell ${tone}`}
            >
              <div className="cal-cell__head">
                <span className="cal-cell__day">{dia}</span>
                {esHoy && <span className="cal-cell__hoy">Hoy</span>}
              </div>
              {activo && (
                <div className="cal-cell__stats">
                  {entradas > 0 && (
                    <span className="cal-stat cal-stat--in">{entradas}</span>
                  )}
                  {salidas > 0 && (
                    <span className="cal-stat cal-stat--out">{salidas}</span>
                  )}
                  {showGastos && gastos > 0 && (
                    <span className="cal-stat cal-stat--gas">{gastos}</span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
