import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Forma de los datos que este dashboard lee de Firestore. Se escribe desde
// hacerCierreCaja (lavanderia-local/app/gerente/page.tsx) y desde
// lavanderia-local/scripts/backfill-panel-remoto.ts justo después de cada
// cierre de caja: colección "panelRemoto", un documento por día con id
// "YYYY-MM-DD".
//
// Este proyecto es ESTRICTAMENTE DE SOLO LECTURA a propósito: no existe
// ninguna función de escritura aquí (a diferencia de la copia de
// lavanderia-local, que sí tiene guardarPanelRemotoEnFirestore). No es un
// descuido -- es la garantía de que nada en este sitio pueda escribir en
// Firestore, ni por error.

export type MovimientoRemoto = {
  pedidoId: number;
  cliente: string;
  total: number;
  abonado: number;
  hora: string; // ISO 8601
};

export type CierreRemoto = {
  id: number;
  efectivo: number;
  nequi: number;
  daviplata: number;
  transferencia: number;
  tarjeta: number;
  gastos: number;
  totalCaja: number; // nombre histórico de la columna: es la GANANCIA NETA (lib/caja.ts en lavanderia-local)
  responsable: string | null;
  createdAt: string; // ISO 8601
  // Agregados junto con el backfill (22-sep-2026) para las tendencias del
  // dashboard. OPCIONALES a propósito: los documentos escritos por
  // hacerCierreCaja en vivo, antes de este cambio, no los tienen todavía --
  // ver el aviso correspondiente en el commit del backfill.
  gastosEfectivo?: number;
  efectivoEnCaja?: number;
};

export type PanelRemotoData = {
  fecha: string; // YYYY-MM-DD
  entradas: MovimientoRemoto[];
  salidas: MovimientoRemoto[];
  cierre: CierreRemoto | null;
};

const COLECCION = "panelRemoto";

/** Clave usada para guardar/leer la caché offline de un día dado. */
export function claveCachePanelRemoto(fecha: string): string {
  return `panelRemoto:${fecha}`;
}

/** Clave de caché para el historial completo (todos los días). */
export const CLAVE_CACHE_HISTORIAL = "panelRemoto:historial";

/** Formatea una fecha como YYYY-MM-DD (hora local) — id del documento del día. */
export function formatearFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function fechaHoy(): string {
  return formatearFecha(new Date());
}

/**
 * Trae los datos del día desde Firestore. Tres resultados posibles, a propósito
 * distinguibles por el llamador (no los tres colapsados en un solo throw):
 *  - Devuelve los datos si el documento existe y la lectura fue real (server, no
 *    caché del SDK).
 *  - Devuelve null si la lectura fue real (con conexión, fromCache: false) pero el
 *    documento no existe — estado válido, no un fallo.
 *  - Lanza si falla la red, o si el SDK resolvió desde su propia caché interna en
 *    vez del servidor (hay que revisar snap.metadata.fromCache explícitamente).
 */
export async function traerPanelRemotoDeFirestore(fecha: string): Promise<PanelRemotoData | null> {
  const snap = await getDoc(doc(db, COLECCION, fecha));

  if (snap.metadata.fromCache) {
    throw new Error(`Datos de ${fecha} vinieron de la caché interna de Firestore, no del servidor`);
  }

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as PanelRemotoData;
}

/**
 * Trae TODOS los días de panelRemoto (para las tendencias del dashboard),
 * ordenados de más reciente a más antiguo. Mismo criterio de fromCache que
 * traerPanelRemotoDeFirestore: si la lectura no fue real, lanza para que el
 * llamador caiga a la caché local completa (leerHistorialCache).
 */
export async function traerHistorialPanelRemoto(): Promise<PanelRemotoData[]> {
  const snap = await getDocs(collection(db, COLECCION));

  if (snap.metadata.fromCache) {
    throw new Error("El historial de panelRemoto vino de la caché interna de Firestore, no del servidor");
  }

  const dias = snap.docs.map((d) => d.data() as PanelRemotoData);
  dias.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return dias;
}
