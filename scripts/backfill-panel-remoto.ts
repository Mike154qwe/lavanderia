// =============================================================
//  BACKFILL DE panelRemoto (Firestore) -- La Manuelita
// =============================================================
//
// panelRemoto (lib/panel-remoto.ts) solo se escribe en vivo desde
// hacerCierreCaja (app/gerente/page.tsx) cada vez que se hace un cierre --
// nunca hubo una carga retroactiva de los cierres que ya existían en la base
// local antes de que esa sincronización se construyera. Este script llena
// esos huecos, UNA vez, sin tocar nada del sistema local ni de las reglas.
//
// MODELO DE DATOS -- importante para entender los números de este script:
// panelRemoto tiene UN documento POR DÍA (id = "YYYY-MM-DD"), no uno por
// cierre. hacerCierreCaja sobrescribe el documento del día completo cada vez
// que se hace un cierre ese día, así que el documento final de un día con
// varios cierres solo guarda:
//   - entradas/salidas: TODOS los movimientos de ESE DÍA completo.
//   - cierre: los números del ÚLTIMO cierre de ese día (no de cada uno).
// Por eso este script agrupa los CierreCaja por día local y solo puede llenar
// COMO MÁXIMO un documento por día con cierres, sin importar cuántos cierres
// tenga ese día.
//
// Autenticación: cuenta de servicio del Admin SDK (mismo patrón que
// scripts/respaldo-db-firebase.js) -- evita depender de las reglas de
// Firestore, que exigen Firebase Auth para LEER panelRemoto y no permiten
// escribir desde el cliente en absoluto (allow write: if false también para
// panelRemoto: solo la cuenta de servicio escribe).
//
// No sobrescribe nada: si el documento del día ya existe en Firestore (por
// ejemplo, porque el cierre de ese día sí llegó a sincronizarse, o porque
// scripts/respaldo-db-firebase.js u otra corrida ya lo dejó ahí), se omite.
//
// Uso:
//   node scripts/backfill-panel-remoto.ts             # corre de verdad
//   node scripts/backfill-panel-remoto.ts --dry-run    # solo muestra el plan

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// .env no se carga solo fuera de Next.js -- mismo lector a mano que
// scripts/respaldo-db-firebase.js, sin agregar dotenv como dependencia nueva.
function cargarEnv(ruta: string) {
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    if (!linea.includes("=") || linea.trim().startsWith("#")) continue;
    const i = linea.indexOf("=");
    const clave = linea.slice(0, i).trim();
    const valor = linea.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (clave && !(clave in process.env)) process.env[clave] = valor;
  }
}
cargarEnv(path.join(RAIZ, ".env"));

import { PrismaClient } from "@prisma/client";
import { calcularCaja, ventanaDeCierre } from "../lib/caja.ts";
import type { PanelRemotoData, MovimientoRemoto } from "../lib/panel-remoto.ts";

const prisma = new PrismaClient();

function inicioDiaLocal(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}
function finDiaLocal(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}
/** YYYY-MM-DD en hora LOCAL (no UTC) -- mismo criterio que formatearFecha() en lib/panel-remoto.ts. */
function fechaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function clienteFirestore() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (!getApps().length) {
    const rutaClave = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!rutaClave) {
      throw new Error(
        "Falta FIREBASE_SERVICE_ACCOUNT_PATH en .env -- ruta al JSON de la cuenta de servicio del Admin SDK."
      );
    }
    const rutaAbsoluta = path.resolve(rutaClave);
    if (!existsSync(rutaAbsoluta)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH apunta a un archivo que no existe: ${rutaAbsoluta}`);
    }
    const credenciales = JSON.parse(readFileSync(rutaAbsoluta, "utf8"));
    initializeApp({ credential: cert(credenciales) });
  }
  return getFirestore();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = await clienteFirestore();

  const cierres = await prisma.cierreCaja.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`[${new Date().toISOString()}] ${cierres.length} cierres en la base local.`);

  // Agrupa por día LOCAL -- panelRemoto es un documento por día, no por cierre.
  const porDia = new Map<string, typeof cierres>();
  for (const c of cierres) {
    const clave = fechaLocal(c.createdAt);
    if (!porDia.has(clave)) porDia.set(clave, []);
    porDia.get(clave)!.push(c);
  }
  console.log(`${porDia.size} día(s) distinto(s) con al menos un cierre: ${[...porDia.keys()].join(", ")}`);

  let creados = 0;
  let omitidos = 0;

  for (const [fecha, cierresDelDia] of [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const yaExiste = (await db.collection("panelRemoto").doc(fecha).get()).exists;
    if (yaExiste) {
      console.log(`  ${fecha}: ya existe en Firestore -- se omite (no se sobrescribe).`);
      omitidos++;
      continue;
    }

    const inicio = inicioDiaLocal(cierresDelDia[0].createdAt);
    const fin = finDiaLocal(cierresDelDia[0].createdAt);
    const ultimoCierre = cierresDelDia.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));

    // Ventana del ÚLTIMO cierre del día -- misma regla que hacerCierreCaja/el
    // ticket, para que estos números coincidan con lo que ya se validó.
    const ventana = ventanaDeCierre(ultimoCierre.createdAt, cierresDelDia, inicio);
    const [pagosDia, gastosDia] = await Promise.all([
      prisma.pago.findMany({ where: { createdAt: { gt: ventana.desde, lte: ventana.hasta } } }),
      prisma.gastoCaja.findMany({ where: { createdAt: { gt: ventana.desde, lte: ventana.hasta } } }),
    ]);
    const caja = calcularCaja(pagosDia, gastosDia);

    // entradas/salidas: el DÍA COMPLETO (no solo la ventana del último cierre),
    // exactamente como hacerCierreCaja construye pedidosDia/salidasDia.
    const [pedidosDia, salidasDia] = await Promise.all([
      prisma.pedido.findMany({
        where: { createdAt: { gte: inicio, lt: fin } },
        include: { cliente: true, pagos: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.historialEstado.findMany({
        where: { estado: "ENTREGADO", createdAt: { gte: inicio, lt: fin } },
        include: { pedido: { include: { cliente: true, pagos: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const entradas: MovimientoRemoto[] = pedidosDia.map((p: any) => ({
      pedidoId: p.id,
      cliente: p.cliente.nombre,
      total: p.total,
      abonado: p.pagos.reduce((s: number, pg: any) => s + pg.valor, 0),
      hora: p.createdAt.toISOString(),
    }));
    const salidas: MovimientoRemoto[] = salidasDia.map((s: any) => ({
      pedidoId: s.pedido.id,
      cliente: s.pedido.cliente.nombre,
      total: s.pedido.total,
      abonado: s.pedido.pagos.reduce((sum: number, pg: any) => sum + pg.valor, 0),
      hora: s.createdAt.toISOString(),
    }));

    // Superset de CierreRemoto (lib/panel-remoto.ts): agrega gastosEfectivo y
    // efectivoEnCaja, que el tipo actual no tiene -- necesarios para el nuevo
    // dashboard (tendencia de efectivo en caja por día). hacerCierreCaja NO
    // escribe estos dos campos todavía; ver el aviso en el mensaje de cierre.
    const panelData: PanelRemotoData & {
      cierre: NonNullable<PanelRemotoData["cierre"]> & { gastosEfectivo: number; efectivoEnCaja: number };
    } = {
      fecha,
      entradas,
      salidas,
      cierre: {
        id: ultimoCierre.id,
        efectivo: caja.efectivo,
        nequi: caja.nequi,
        daviplata: caja.daviplata,
        transferencia: caja.transferencia,
        tarjeta: caja.tarjeta,
        gastos: caja.totalGastos,
        gastosEfectivo: caja.gastosEfectivo,
        totalCaja: caja.gananciaNeta,
        efectivoEnCaja: caja.efectivoEnCaja,
        responsable: ultimoCierre.responsable,
        createdAt: ultimoCierre.createdAt.toISOString(),
      },
    };

    console.log(
      `  ${fecha}: ${cierresDelDia.length} cierre(s) (#${cierresDelDia.map((c) => c.id).join(", #")}) -- ` +
        `último #${ultimoCierre.id} -- ganancia neta ${caja.gananciaNeta} · efectivo en caja ${caja.efectivoEnCaja} -- ` +
        `${entradas.length} entradas, ${salidas.length} salidas` +
        (dryRun ? "  [dry-run, no se escribe]" : "")
    );

    if (!dryRun) {
      await db.collection("panelRemoto").doc(fecha).set(panelData);
    }
    creados++;
  }

  console.log(
    `\n[${new Date().toISOString()}] ${dryRun ? "Plan (dry-run)" : "Listo"}: ` +
      `${creados} documento(s) nuevo(s), ${omitidos} ya existían y se dejaron intactos.`
  );
}

main()
  .catch((e) => {
    console.error("FALLÓ el backfill:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
