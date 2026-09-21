// Pruebas unitarias de lib/caja.ts: el cálculo ÚNICO de la caja.
//
// El negocio necesita DOS números separados (decisión del 21-sep-2026):
//   - Ganancia neta   = todo lo recibido − todos los gastos, sin importar el medio.
//   - Efectivo en caja = efectivo recibido − SOLO los gastos pagados en efectivo.
//
// Uso:  npm run test:caja
import { test } from "node:test";
import assert from "node:assert/strict";

const { calcularCaja, ventanaDeCierre, enVentana, MEDIO_EFECTIVO } = await import("../lib/caja.ts");

const pago = (metodo, valor) => ({ metodo, valor });

// ── Los 4 escenarios del bug «cierre de caja negativo» ────────────────────────
const ESCENARIOS = [
  {
    nombre: "control: todo en efectivo",
    pagos: [pago("Efectivo", 100000)],
    gastos: [pago("Efectivo", 30000)],
    neta: 70000,
    efectivo: 70000,
  },
  {
    // Réplica del 11-jun-2026: efectivo 130.500 + digital 87.000, nómina de 400.000 por Nequi.
    nombre: "nómina de $400.000 por Nequi",
    pagos: [pago("Efectivo", 30000), pago("Efectivo", 30000), pago("Efectivo", 32500), pago("Efectivo", 38000), pago("Nequi", 52500), pago("Daviplata", 34500)],
    gastos: [pago("Nequi", 400000)],
    neta: 217500 - 400000, // -182.500: ese día se ganó menos de lo que costó la nómina
    efectivo: 130500, // ningún peso salió del cajón
  },
  {
    nombre: "repro de Joel: ingreso por Nequi y gasto en efectivo",
    pagos: [pago("Nequi", 100000)],
    gastos: [pago("Efectivo", 150000)],
    neta: -50000, // entraron 100.000 y salieron 150.000
    efectivo: -150000, // el cajón pagó 150.000 sin haber recibido efectivo
  },
  {
    // Réplica del cierre #14 (12-jun-2026).
    nombre: "réplica del cierre #14 real",
    pagos: [pago("Efectivo", 83580), pago("Transferencia", 15840)],
    gastos: [pago("Transferencia", 18000), pago("Efectivo", 45000)],
    neta: 36420,
    efectivo: 38580,
  },
];

for (const e of ESCENARIOS) {
  test(`escenario «${e.nombre}»: ganancia neta ${e.neta} y efectivo en caja ${e.efectivo}`, () => {
    const r = calcularCaja(e.pagos, e.gastos);
    assert.equal(r.gananciaNeta, e.neta, "ganancia neta");
    assert.equal(r.efectivoEnCaja, e.efectivo, "efectivo en caja");
  });
}

test("control: en un día todo en efectivo los dos números coinciden", () => {
  const r = calcularCaja([pago("Efectivo", 100000)], [pago("Efectivo", 30000)]);
  assert.equal(r.gananciaNeta, r.efectivoEnCaja);
});

// ── La diferencia entre los dos números tiene una causa exacta ────────────────
test("efectivo en caja − ganancia neta = gastos NO en efectivo − ingresos NO en efectivo", () => {
  for (const e of ESCENARIOS) {
    const r = calcularCaja(e.pagos, e.gastos);
    const ingresosDigitales = r.totalRecibido - r.efectivo;
    const gastosDigitales = r.totalGastos - r.gastosEfectivo;
    assert.equal(r.efectivoEnCaja - r.gananciaNeta, gastosDigitales - ingresosDigitales, e.nombre);
  }
});

test("cierre #14: la diferencia de $2.160 entre 38.580 y 36.420 es exactamente el neto digital (15.840 − 18.000)", () => {
  const r = calcularCaja([pago("Efectivo", 83580), pago("Transferencia", 15840)], [pago("Transferencia", 18000), pago("Efectivo", 45000)]);
  assert.equal(r.efectivoEnCaja - r.gananciaNeta, 2160);
  assert.equal(18000 - 15840, 2160);
});

// ── Reglas de cada número ─────────────────────────────────────────────────────
test("efectivo en caja ignora Nequi/Daviplata/Transferencia/Tarjeta, tanto en ingresos como en gastos", () => {
  const r = calcularCaja(
    [pago("Efectivo", 1000), pago("Nequi", 500000), pago("Daviplata", 1), pago("Transferencia", 2), pago("Tarjeta", 3)],
    [pago("Efectivo", 400), pago("Nequi", 500000), pago("Daviplata", 7), pago("Transferencia", 8)],
  );
  assert.equal(r.efectivoEnCaja, 600);
});

test("ganancia neta cuenta todos los medios, tarjeta incluida", () => {
  const r = calcularCaja([pago("Efectivo", 10), pago("Nequi", 20), pago("Daviplata", 30), pago("Transferencia", 40), pago("Tarjeta", 50)], [pago("Efectivo", 5), pago("Nequi", 6)]);
  assert.equal(r.gananciaNeta, 150 - 11);
  assert.equal(r.tarjeta, 50);
});

test("un medio desconocido no cuenta como efectivo", () => {
  const r = calcularCaja([pago("Efectivo", 100)], [pago("Otro", 30), pago("efectivo", 10)]);
  assert.equal(r.efectivoEnCaja, 100, "solo «Efectivo» exacto descuenta del cajón");
  assert.equal(r.totalGastos, 40);
});

test("sin movimientos todo es cero", () => {
  const r = calcularCaja([], []);
  assert.deepEqual(r, {
    efectivo: 0, nequi: 0, daviplata: 0, transferencia: 0, tarjeta: 0,
    totalRecibido: 0, totalGastos: 0, gastosEfectivo: 0, gananciaNeta: 0, efectivoEnCaja: 0,
  });
});

test("el medio de efectivo es «Efectivo» (el mismo valor que guardan los formularios)", () => {
  assert.equal(MEDIO_EFECTIVO, "Efectivo");
});

// ── Ventana de un cierre (misma regla que hacerCierreCaja y el ticket) ────────
const h = (hora, min = 0) => new Date(2026, 8, 1, hora, min);
const INICIO = h(0);
const CIERRES = [{ createdAt: h(10) }, { createdAt: h(12) }, { createdAt: h(15) }];

test("ventana del primer cierre del día: desde el inicio del día", () => {
  const v = ventanaDeCierre(h(10), CIERRES, INICIO);
  assert.equal(v.desde.getTime(), INICIO.getTime());
  assert.equal(v.hasta.getTime(), h(10).getTime());
});

test("ventana de un cierre posterior: desde el cierre anterior del mismo día", () => {
  const v = ventanaDeCierre(h(12), CIERRES, INICIO);
  assert.equal(v.desde.getTime(), h(10).getTime());
  assert.equal(v.hasta.getTime(), h(12).getTime());
});

test("enVentana excluye el límite inferior e incluye el superior", () => {
  const v = ventanaDeCierre(h(12), CIERRES, INICIO);
  const items = [
    { id: "justo en el cierre anterior", createdAt: h(10) },
    { id: "dentro", createdAt: h(11) },
    { id: "justo en este cierre", createdAt: h(12) },
    { id: "después", createdAt: h(12, 1) },
  ];
  assert.deepEqual(enVentana(items, v).map((i) => i.id), ["dentro", "justo en este cierre"]);
});
