// Cálculo ÚNICO de la caja. Lo usan las cuatro vistas (cierre de caja, /gerente,
// /gerente/dia/[fecha] y el ticket de cierre): ninguna debe reimplementar estas
// cuentas, para que no puedan volver a desincronizarse.
//
// El negocio necesita DOS números separados y con nombres claros (decisión del
// 21-sep-2026). No son la misma cuenta y no se sustituyen:
//
//   · GANANCIA NETA (del día o del cierre) = todo lo recibido − todos los gastos,
//     sin importar el medio de pago (efectivo, Nequi, Daviplata, transferencia,
//     tarjeta). Es la fórmula histórica de la app; puede ser negativa de forma
//     legítima (p. ej. un día con una nómina grande). Nunca se llama «caja
//     esperada»: no dice cuánto hay en el cajón.
//
//   · EFECTIVO EN CAJA = efectivo recibido − SOLO los gastos pagados en efectivo
//     (GastoCaja.metodo === "Efectivo"). Ignora los demás medios, tanto en
//     ingresos como en gastos. Sirve para cuadrar el cajón físico.
//     Es el movimiento neto de efectivo de la ventana calculada, no un saldo: el
//     modelo no guarda fondo inicial de caja, así que el cajón real es el fondo
//     con el que se empezó más este número.
//
// Nota de nombres: la columna CierreCaja.totalCaja de la base guarda la GANANCIA
// NETA (nombre histórico; no se renombra para no migrar el esquema).
//
// Sin imports a propósito: así se puede probar directamente con `node --test`.

export const MEDIO_EFECTIVO = "Efectivo";

/** Un pago o un gasto: solo importan el valor y el medio de pago. */
export type Movimiento = { valor: number; metodo: string };

export type ResumenCaja = {
  // Ingresos por medio de pago
  efectivo: number;
  nequi: number;
  daviplata: number;
  transferencia: number;
  tarjeta: number;
  totalRecibido: number;
  // Gastos
  totalGastos: number;
  gastosEfectivo: number;
  // Los dos números
  gananciaNeta: number;
  efectivoEnCaja: number;
};

const sumar = (movs: Movimiento[], metodo?: string) =>
  movs.reduce((s, m) => (metodo === undefined || m.metodo === metodo ? s + m.valor : s), 0);

export function calcularCaja(pagos: Movimiento[], gastos: Movimiento[]): ResumenCaja {
  const efectivo = sumar(pagos, "Efectivo");
  const nequi = sumar(pagos, "Nequi");
  const daviplata = sumar(pagos, "Daviplata");
  const transferencia = sumar(pagos, "Transferencia");
  const tarjeta = sumar(pagos, "Tarjeta");

  // Todo lo recibido, incluido un medio que no esté en la lista de arriba.
  const totalRecibido = sumar(pagos);
  const totalGastos = sumar(gastos);
  const gastosEfectivo = sumar(gastos, MEDIO_EFECTIVO);

  return {
    efectivo,
    nequi,
    daviplata,
    transferencia,
    tarjeta,
    totalRecibido,
    totalGastos,
    gastosEfectivo,
    gananciaNeta: totalRecibido - totalGastos,
    efectivoEnCaja: efectivo - gastosEfectivo,
  };
}

/** Ventana de movimientos de un cierre: (desde, hasta]. */
export type Ventana = { desde: Date; hasta: Date };

/**
 * Ventana que cubre un cierre: desde el cierre anterior del MISMO día (o el
 * inicio del día si es el primero) hasta el propio cierre. Es la regla de
 * hacerCierreCaja y del ticket, para que las tarjetas de /gerente y el ticket
 * calculen exactamente sobre los mismos movimientos.
 */
export function ventanaDeCierre(hasta: Date, cierresDelDia: { createdAt: Date }[], inicioDelDia: Date): Ventana {
  let desde = inicioDelDia;
  for (const c of cierresDelDia) {
    if (c.createdAt < hasta && c.createdAt > desde) desde = c.createdAt;
  }
  return { desde, hasta };
}

/** Movimientos dentro de la ventana: excluye el límite inferior, incluye el superior. */
export function enVentana<T extends { createdAt: Date }>(items: T[], v: Ventana): T[] {
  return items.filter((i) => i.createdAt > v.desde && i.createdAt <= v.hasta);
}
