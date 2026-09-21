// Reproducción del bug «cierre de caja negativo» (ver docs/bug-cierre-caja-negativo.md).
//
// Qué hace: crea una base SQLite TEMPORAL (migraciones reales, NUNCA prisma/dev.db),
// siembra escenarios con el responsable «Prueba QA - bug caja» y ejecuta el código
// REAL de app/cierres-caja/[id]/ticket/route.ts, que recalcula «Total caja» a partir
// de los pagos y gastos de la ventana del cierre. Es la misma fórmula que usan
// hacerCierreCaja y los KPI «Caja esperada» (ver el documento).
//
// Qué espera: «caja física» = efectivo cobrado − gastos pagados en efectivo. Los
// pagos y gastos por Nequi/Daviplata/Transferencia/Tarjeta no entran ni salen del
// cajón. Es la definición del repro de origin/fix/cierre-caja-negativo
// («totalCajaFisicaEsperada») y de la etiqueta «Caja esperada».
//
// Estado esperado HOY: los escenarios 1, 2 y 3 FALLAN (bug) y el 0 (control) pasa.
//
// Uso:  npm run test:caja        (KEEP_QA_DB=1 conserva la base para inspeccionarla)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

register("./helpers/alias-loader.mjs", import.meta.url);

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESPONSABLE = "Prueba QA - bug caja";

let tmp;
let prisma;
let GET;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lavaseco-qa-caja-"));
  const archivoDb = path.join(tmp, "qa.db").replaceAll("\\", "/");
  const url = `file:${archivoDb}`;
  process.env.DATABASE_URL = url;

  // Migraciones reales sobre la base temporal (sin red).
  execFileSync(process.execPath, [path.join(RAIZ, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    cwd: RAIZ,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  ({ prisma } = await import("../lib/prisma.ts"));
  ({ GET } = await import("../app/cierres-caja/[id]/ticket/route.ts"));

  // Guardia: jamás sembrar en la base real. Si el cliente no apunta al archivo
  // temporal, se aborta antes de escribir nada.
  const [{ file }] = await prisma.$queryRawUnsafe("PRAGMA database_list");
  assert.equal(
    file.replaceAll("\\", "/").toLowerCase(),
    archivoDb.toLowerCase(),
    `El cliente Prisma apunta a ${file}, no a la base temporal. Se aborta.`,
  );

  await prisma.sede.create({ data: { id: 1, nombre: "Sede QA (aislada)" } });
});

after(async () => {
  await prisma?.$disconnect();
  if (process.env.KEEP_QA_DB) {
    console.log(`Base QA conservada en: ${path.join(tmp, "qa.db")}`);
  } else if (tmp) {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5 });
  }
});

// ── Escenarios ────────────────────────────────────────────────────────────────
// pagos:  [medio, valor]         gastos: [medio, valor, tipo]
const CASOS = [
  {
    id: 0,
    dia: [2026, 8, 4],
    titulo: "control: todo en efectivo (fórmula actual y caja física coinciden)",
    pagos: [["Efectivo", 100000]],
    gastos: [["Efectivo", 30000, "Insumos"]],
    esperado: 70000,
  },
  {
    id: 1,
    dia: [2026, 8, 1],
    titulo: "nómina pagada por Nequi NO debe dejar la caja en negativo",
    // Réplica del 11-jun-2026: efectivo 130.500 + digital 87.000, gasto Nequi 400.000.
    pagos: [
      ["Efectivo", 30000],
      ["Efectivo", 30000],
      ["Efectivo", 32500],
      ["Efectivo", 38000],
      ["Nequi", 52500],
      ["Daviplata", 34500],
    ],
    gastos: [["Nequi", 400000, "Nómina"]],
    esperado: 130500,
  },
  {
    id: 2,
    dia: [2026, 8, 2],
    titulo: "repro de Joel: ingreso por Nequi y gasto en efectivo",
    pagos: [["Nequi", 100000]],
    gastos: [["Efectivo", 150000, "Insumos"]],
    esperado: -150000,
  },
  {
    id: 3,
    dia: [2026, 8, 3],
    titulo: "réplica del cierre #14 real (12-jun-2026)",
    pagos: [
      ["Efectivo", 83580],
      ["Transferencia", 15840],
    ],
    gastos: [
      ["Transferencia", 18000, "Insumos"],
      ["Efectivo", 45000, "Jabones"],
    ],
    esperado: 38580,
  },
];

const sumar = (filas, medio) =>
  filas.filter(([m]) => !medio || m === medio).reduce((s, f) => s + f[1], 0);

/** Definición que se espera: efectivo cobrado − gastos pagados en efectivo. */
const cajaFisica = (pagos, gastos) => sumar(pagos, "Efectivo") - sumar(gastos, "Efectivo");

/**
 * Siembra el escenario en la ventana [00:00, 18:00] de un día y crea el cierre
 * con los valores que hoy guardaría hacerCierreCaja (app/gerente/page.tsx).
 */
async function sembrar(caso) {
  const hora = (h, m = 0) => new Date(caso.dia[0], caso.dia[1], caso.dia[2], h, m);
  const nota = `QA bug caja · escenario ${caso.id}: ${caso.titulo}`;

  const cliente = await prisma.cliente.create({
    data: { nombre: RESPONSABLE, telefono: `QA-caja-${caso.id}` },
  });
  const pedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      servicio: "QA",
      total: sumar(caso.pagos),
      estado: "ENTREGADO",
      observacion: nota,
      createdAt: hora(9),
    },
  });

  for (const [i, [metodo, valor]] of caso.pagos.entries()) {
    await prisma.pago.create({ data: { pedidoId: pedido.id, metodo, valor, createdAt: hora(10, i) } });
  }
  for (const [i, [metodo, valor, tipo]] of caso.gastos.entries()) {
    await prisma.gastoCaja.create({
      data: { tipo, descripcion: nota, valor, metodo, responsable: RESPONSABLE, createdAt: hora(11, i) },
    });
  }

  // Igual que hacerCierreCaja (app/gerente/page.tsx, líneas 69-75).
  const efectivo = sumar(caso.pagos, "Efectivo");
  const nequi = sumar(caso.pagos, "Nequi");
  const daviplata = sumar(caso.pagos, "Daviplata");
  const transferencia = sumar(caso.pagos, "Transferencia");
  const tarjeta = sumar(caso.pagos, "Tarjeta");
  const gastos = sumar(caso.gastos);
  return prisma.cierreCaja.create({
    data: {
      efectivo,
      nequi,
      daviplata,
      transferencia,
      tarjeta,
      gastos,
      totalCaja: efectivo + nequi + daviplata + transferencia + tarjeta - gastos,
      responsable: RESPONSABLE,
      observacion: nota,
      createdAt: hora(18),
    },
  });
}

/** Ejecuta el GET real del ticket y lee los totales que imprime. */
async function leerTicket(cierreId) {
  const res = await GET(new Request("http://qa.local/ticket"), {
    params: Promise.resolve({ id: String(cierreId) }),
  });
  assert.equal(res.status, 200, "el ticket debe existir");
  const html = await res.text();

  const leer = (etiqueta) => {
    const m = html.match(new RegExp(`${etiqueta}</span>\\s*<span[^>]*>-?\\$(-?[\\d.,]+)</span>`));
    assert.ok(m, `no se encontró «${etiqueta}» en el ticket`);
    const n = Number(m[1].replace(/[^\d]/g, ""));
    // «Total gastos» se imprime como «-$X»; «Total caja» como «$-X» si es negativo.
    return m[1].startsWith("-") ? -n : n;
  };

  return { recibido: leer("Total recibido"), gastos: leer("Total gastos"), caja: leer("Total caja") };
}

const fmt = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("es-CO");

for (const caso of CASOS) {
  test(`escenario ${caso.id} — ${caso.titulo}`, async () => {
    assert.equal(cajaFisica(caso.pagos, caso.gastos), caso.esperado, "el esperado del escenario debe ser la caja física");

    const cierre = await sembrar(caso);
    const ticket = await leerTicket(cierre.id);

    assert.equal(
      ticket.caja,
      caso.esperado,
      [
        `«Total caja» del ticket del cierre #${cierre.id} (${RESPONSABLE}) no es la caja física.`,
        `  Pagos:  efectivo ${fmt(sumar(caso.pagos, "Efectivo"))} · digitales ${fmt(sumar(caso.pagos) - sumar(caso.pagos, "Efectivo"))}`,
        `  Gastos: efectivo ${fmt(sumar(caso.gastos, "Efectivo"))} · digitales ${fmt(sumar(caso.gastos) - sumar(caso.gastos, "Efectivo"))}`,
        `  Fórmula actual:  ${fmt(ticket.recibido)} recibido − ${fmt(ticket.gastos)} gastos = ${fmt(ticket.caja)}`,
        `  Caja física esperada (efectivo − gastos en efectivo): ${fmt(caso.esperado)}`,
        `  Causa: la fórmula suma TODOS los medios de pago y resta TODOS los gastos sin mirar GastoCaja.metodo.`,
      ].join("\n"),
    );
  });
}
