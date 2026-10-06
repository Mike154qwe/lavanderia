export function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

/** Alias corto para formatPedido */
export const fmt = formatPedido;

/** Formatea pesos. El signo va antes del símbolo: -$182.500, no $-182.500. */
export function money(value: number) {
  const abs = Math.abs(value).toLocaleString("es-CO");
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

/** Zona civil del negocio. Toda agrupación de día y toda fecha mostrada usa esta zona, no la del servidor. */
export const TZ_NEGOCIO = "America/Bogota";

export type PartesFecha = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partesEnZona(d: Date, timeZone: string): PartesFecha {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: n("year"),
    month: n("month"),
    day: n("day"),
    hour: n("hour"),
    minute: n("minute"),
    second: n("second"),
  };
}

export function partesBogota(d: Date): PartesFecha {
  return partesEnZona(d, TZ_NEGOCIO);
}

/** Offset de la zona: (reloj de pared interpretado como UTC) − instante. Bogotá es −5 h. */
function offsetMs(d: Date, timeZone: string): number {
  const p = partesEnZona(d, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - d.getTime();
}

/** Calendario civil de Bogotá → instante UTC. `monthIndex` es 0-based, como `Date`. */
export function civilBogota(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const asUtc = () => Date.UTC(year, monthIndex, day, hour, minute, second);
  let instant = asUtc() - offsetMs(new Date(asUtc()), TZ_NEGOCIO);
  instant = asUtc() - offsetMs(new Date(instant), TZ_NEGOCIO);
  return new Date(instant);
}

/** Medianoche de Bogotá del día civil que contiene `d`. */
export function inicioDia(d: Date): Date {
  const p = partesBogota(d);
  return civilBogota(p.year, p.month - 1, p.day);
}

/** Medianoche de Bogotá del día siguiente al de `d`. */
export function finDia(d: Date): Date {
  const p = partesBogota(d);
  return civilBogota(p.year, p.month - 1, p.day + 1);
}

export function sameDay(a: Date, b: Date): boolean {
  const x = partesBogota(a);
  const y = partesBogota(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** Clave "YYYY-M-D" en calendario Bogotá (mes 1-based). */
export function dayKey(d: Date): string {
  const p = partesBogota(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "YYYY-MM-DD" en calendario Bogotá — query `?fecha=` e id del panel remoto. */
export function isoFecha(d: Date): string {
  const p = partesBogota(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Interpreta `YYYY-MM-DD` como medianoche en Bogotá, no como hora local del servidor. */
export function parseFechaParam(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return inicioDia(new Date());
  return civilBogota(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function inicioAno(year: number): Date {
  return civilBogota(year, 0, 1);
}

export function inicioMes(year: number, monthIndex: number): Date {
  return civilBogota(year, monthIndex, 1);
}

export function yearBogota(d = new Date()): number {
  return partesBogota(d).year;
}

/** Días de calendario Bogotá entre `fecha` y `ahora` (puede ser negativo si `fecha` es futura). */
export function diasCalendarioDesde(fecha: Date, ahora = new Date()): number {
  const a = partesBogota(fecha);
  const b = partesBogota(ahora);
  return Math.floor(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  );
}

export function haceMeses(d: Date, meses: number): Date {
  const p = partesBogota(d);
  return civilBogota(p.year, p.month - 1 - meses, p.day, p.hour, p.minute, p.second);
}

/** "Martes, 6 de octubre de 2026" — calendario Bogotá. */
export function fechaLarga(d: Date) {
  const raw = d.toLocaleDateString("es-CO", {
    timeZone: TZ_NEGOCIO,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** "06/10/2026" día/mes/año en Bogotá. */
export function fechaCorta(d: Date) {
  const p = partesBogota(d);
  return `${String(p.day).padStart(2, "0")}/${String(p.month).padStart(2, "0")}/${p.year}`;
}

/** Hora corta en Bogotá, p. ej. "10:30 p. m.". */
export function fechaHora(d: Date) {
  return d.toLocaleTimeString("es-CO", {
    timeZone: TZ_NEGOCIO,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "6 oct" en Bogotá. */
export function fechaDiaMes(d: Date) {
  return d.toLocaleDateString("es-CO", {
    timeZone: TZ_NEGOCIO,
    day: "numeric",
    month: "short",
  });
}

/** "octubre de 2026" en Bogotá. */
export function fechaMesAno(d: Date) {
  return d.toLocaleDateString("es-CO", {
    timeZone: TZ_NEGOCIO,
    month: "long",
    year: "numeric",
  });
}

export const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO:   "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  EN_PROCESO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  LISTO:      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  ENTREGADO:  "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
  CANCELADO:  "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
};

export const ESTADO_LABEL: Record<string, string> = {
  RECIBIDO:   "Recibido",
  EN_PROCESO: "En proceso",
  LISTO:      "Listo",
  ENTREGADO:  "Entregado",
  CANCELADO:  "Cancelado",
};

export function estadoLabel(estado: string) {
  return ESTADO_LABEL[estado] ?? estado.replaceAll("_", " ");
}
