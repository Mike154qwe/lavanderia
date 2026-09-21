// Cierre de caja bajo el modelo de DOS números (ver lib/caja.ts y
// docs/bug-cierre-caja-negativo.md).
//
// Crea una base SQLite TEMPORAL (migraciones reales, NUNCA prisma/dev.db), siembra
// escenarios con el responsable «Prueba QA - bug caja» y ejecuta el código REAL de
// app/cierres-caja/[id]/ticket/route.ts, que recalcula los totales a partir de los
// pagos y gastos de la ventana del cierre.
//
// Qué espera el ticket:
//   - «Ganancia neta»   = todo lo recibido − todos los gastos (cualquier medio).
//   - «Efectivo en caja» = efectivo recibido − SOLO los gastos pagados en efectivo.
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
let calcularCaja;

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
  ({ calcularCaja } = await import("../lib/caja.ts"));

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
// pagos: [medio, valor]   gastos: [medio, valor, tipo]   neta / efectivo: lo que debe mostrar el ticket
const CASOS = [
  {
    id: 0,
    dia: [2026, 8, 4],
    titulo: "control: todo en efectivo",
    pagos: [["Efectivo", 100000]],
    gastos: [["Efectivo", 30000, "Insumos"]],
    neta: 70000,
    efectivo: 70000,
  },
  {
    id: 1,
    dia: [2026, 8, 1],
    titulo: "nómina de $400.000 por Nequi",
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
    // Se ganó $217.500 y la nómina costó $400.000: el neto negativo es coherente con los datos.
    neta: -182500,
    efectivo: 130500, // ningún peso salió del cajón
  },
  {
    id: 2,
    dia: [2026, 8, 2],
    titulo: "repro de Joel: ingreso por Nequi y gasto en efectivo",
    pagos: [["Nequi", 100000]],
    gastos: [["Efectivo", 150000, "Insumos"]],
    neta: -50000, // entraron 100.000 y salieron 150.000
    efectivo: -150000, // el cajón pagó 150.000 sin haber recibido efectivo: coincide con lo esperado por Joel
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
    neta: 36420, // igual al total guardado por el cierre real #14
    efectivo: 38580, // la diferencia de $2.160 es el neto digital: 18.000 − 15.840
  },
];

/**
 * Siembra el escenario en la ventana [00:00, 18:00] de un día y crea el cierre
 * con los valores que guarda hacerCierreCaja (app/gerente/page.tsx), calculados
 * con la misma función compartida (lib/caja.ts).
 */
async function sembrar(caso) {
  const hora = (h, m = 0) => new Date(caso.dia[0], caso.dia[1], caso.dia[2], h, m);
  const nota = `QA bug caja · escenario ${caso.id}: ${caso.titulo}`;
  const movs = (filas) => filas.map(([metodo, valor]) => ({ metodo, valor }));

  const cliente = await prisma.cliente.create({
    data: { nombre: RESPONSABLE, telefono: `QA-caja-${caso.id}` },
  });
  const pedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      servicio: "QA",
      total: caso.pagos.reduce((s, [, v]) => s + v, 0),
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

  const r = calcularCaja(movs(caso.pagos), movs(caso.gastos));
  return prisma.cierreCaja.create({
    data: {
      efectivo: r.efectivo,
      nequi: r.nequi,
      daviplata: r.daviplata,
      transferencia: r.transferencia,
      tarjeta: r.tarjeta,
      gastos: r.totalGastos,
      totalCaja: r.gananciaNeta, // nombre histórico de la columna: guarda la GANANCIA NETA
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
    // Los gastos se imprimen como «-$X» y los negativos como «$-X».
    return m[1].startsWith("-") ? -n : n;
  };

  return {
    html,
    recibido: leer("Total recibido"),
    gastos: leer("Total gastos"),
    neta: leer("Ganancia neta"),
    efectivo: leer("Efectivo en caja"),
  };
}

const fmt = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("es-CO");

for (const caso of CASOS) {
  test(`escenario ${caso.id} — ${caso.titulo}: ganancia neta ${fmt(caso.neta)} · efectivo en caja ${fmt(caso.efectivo)}`, async () => {
    const cierre = await sembrar(caso);
    const t = await leerTicket(cierre.id);

    assert.equal(
      t.neta,
      caso.neta,
      `«Ganancia neta» del ticket del cierre #${cierre.id} (${RESPONSABLE}): ${fmt(t.recibido)} recibido − ${fmt(t.gastos)} gastos.`,
    );
    assert.equal(
      t.efectivo,
      caso.efectivo,
      `«Efectivo en caja» del ticket del cierre #${cierre.id} (${RESPONSABLE}): efectivo recibido − solo los gastos pagados en efectivo.`,
    );
  });
}

test("el ticket ya no usa las etiquetas «Total caja» ni «Caja esperada»", async () => {
  const cierre = await sembrar({ ...CASOS[0], id: 90, dia: [2026, 8, 20] });
  const { html } = await leerTicket(cierre.id);
  assert.ok(!/Total caja|Caja esperada/i.test(html), "el ticket debe decir «Ganancia neta» y «Efectivo en caja»");
});

// ── Las cuatro vistas usan LA MISMA lógica (prueba estática) ──────────────────
// La fórmula vivía copiada en cuatro sitios y se desincronizó. Ahora ninguna vista
// puede calcular la caja por su cuenta: deben importar lib/caja.ts.
const VISTAS = [
  "app/gerente/page.tsx",
  "app/gerente/dia/[fecha]/page.tsx",
  "app/cierres-caja/[id]/ticket/route.ts",
];

for (const vista of VISTAS) {
  test(`${vista}: usa lib/caja.ts y no reimplementa la fórmula`, () => {
    const src = fs.readFileSync(path.join(RAIZ, vista), "utf8");
    assert.match(src, /from "@\/lib\/caja"/, "debe importar el cálculo compartido");
    assert.ok(!/totalRecibido\s*-\s*totalGastos|totalPagos\(pagos\)\s*-\s*totalGastos/.test(src), "no debe restar totalRecibido − totalGastos por su cuenta");
    assert.ok(!/tarjeta\s*-\s*totalGastos/.test(src), "no debe sumar los medios y restar los gastos por su cuenta");
  });
}

test("ninguna pantalla de la app dice «Caja esperada»", () => {
  const hallazgos = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.(tsx|ts)$/.test(e.name) && /Caja esperada/i.test(fs.readFileSync(p, "utf8"))) hallazgos.push(path.relative(RAIZ, p));
    }
  };
  recorrer(path.join(RAIZ, "app"));
  assert.deepEqual(hallazgos, [], `Archivos que aún dicen «Caja esperada»: ${hallazgos.join(", ")}`);
});
