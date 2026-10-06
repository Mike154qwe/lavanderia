// Fechas civiles de Bogotá: agrupación y texto no dependen del TZ del proceso.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  TZ_NEGOCIO,
  fechaCorta,
  fechaLarga,
  fechaHora,
  inicioDia,
  finDia,
  sameDay,
  dayKey,
  isoFecha,
  parseFechaParam,
  civilBogota,
  partesBogota,
} = await import("../lib/format.ts");

test("la zona del negocio es America/Bogota", () => {
  assert.equal(TZ_NEGOCIO, "America/Bogota");
});

// 2026-10-06 22:30 COT = 2026-10-07T03:30:00Z
const COT_2230 = new Date("2026-10-06T22:30:00-05:00");
// 2026-10-06 23:50 COT = 2026-10-07T04:50:00Z
const COT_2350 = new Date("2026-10-06T23:50:00-05:00");
const COT_MANANA = new Date("2026-10-07T00:10:00-05:00");

test("pedido 22:30 Bogotá se muestra el 06/10/2026 aunque el instante sea UTC del día 7", () => {
  assert.equal(COT_2230.toISOString(), "2026-10-07T03:30:00.000Z");
  assert.equal(fechaCorta(COT_2230), "06/10/2026");
  assert.match(fechaLarga(COT_2230), /6 de octubre de 2026/i);
  assert.match(fechaHora(COT_2230), /10:30/);
});

test("pedido 23:50 Bogotá se muestra el 06/10/2026", () => {
  assert.equal(COT_2350.toISOString(), "2026-10-07T04:50:00.000Z");
  assert.equal(fechaCorta(COT_2350), "06/10/2026");
  assert.match(fechaHora(COT_2350), /11:50/);
});

test("22:30 y 23:50 Bogotá caen en el mismo día civil y en la ventana [inicio, fin)", () => {
  assert.equal(sameDay(COT_2230, COT_2350), true);
  assert.equal(sameDay(COT_2230, COT_MANANA), false);
  assert.equal(dayKey(COT_2230), dayKey(COT_2350));
  assert.equal(dayKey(COT_2230), "2026-10-6");
  const inicio = inicioDia(COT_2230);
  const fin = finDia(COT_2230);
  assert.equal(isoFecha(inicio), "2026-10-06");
  assert.equal(isoFecha(fin), "2026-10-07");
  assert.ok(COT_2230 >= inicio && COT_2230 < fin);
  assert.ok(COT_2350 >= inicio && COT_2350 < fin);
  assert.ok(COT_MANANA >= fin || COT_MANANA < inicio);
  assert.ok(COT_MANANA >= finDia(COT_2230));
});

test("?fecha=2026-10-06 es medianoche Bogotá, no medianoche del servidor", () => {
  const d = parseFechaParam("2026-10-06");
  assert.equal(d.toISOString(), "2026-10-06T05:00:00.000Z");
  assert.equal(isoFecha(d), "2026-10-06");
  assert.ok(COT_2230 >= d && COT_2230 < finDia(d));
  assert.ok(COT_2350 >= d && COT_2350 < finDia(d));
});

test("civilBogota(2026, 9, 6, 22, 30) coincide con el instante 22:30 COT", () => {
  const d = civilBogota(2026, 9, 6, 22, 30);
  assert.equal(d.toISOString(), COT_2230.toISOString());
  const p = partesBogota(d);
  assert.equal(p.year, 2026);
  assert.equal(p.month, 10);
  assert.equal(p.day, 6);
  assert.equal(p.hour, 22);
  assert.equal(p.minute, 30);
});
