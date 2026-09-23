import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Forma de los datos que el panel remoto de la gerente (app/gerente/remoto)
// espera encontrar en Firestore. Se escribe desde hacerCierreCaja
// (app/gerente/page.tsx) justo después de cada cierre de caja exitoso:
// colección "panelRemoto", un documento por día con id "YYYY-MM-DD".
//
// Este módulo es SEGURO para el navegador a propósito -- lo importa
// app/gerente/remoto/PanelRemotoClient.tsx ("use client"). La ESCRITURA
// (guardarPanelRemotoEnFirestore) vive aparte, en lib/panel-remoto-admin.ts,
// porque necesita el Admin SDK (paquetes de solo-Node: firebase-admin,
// @google-cloud/firestore, grpc). Se probó traerla a este mismo archivo con
// un import dinámico adentro de la función (para no ensuciar el tope del
// archivo), pero Turbopack igual sigue esa importación para armar el bundle
// del cliente y el build falla ("the chunking context does not support
// external modules: node:net") -- un import dinámico sigue siendo parte del
// grafo de módulos alcanzable desde el cliente, no alcanza con eso. La única
// forma de que el Admin SDK nunca llegue al navegador es que viva en un
// archivo que ningún "use client" importe, ni directa ni indirectamente.
// Ver lib/panel-remoto-admin.ts para la escritura real.

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
  totalCaja: number;
  responsable: string | null;
  createdAt: string; // ISO 8601
};

export type PanelRemotoData = {
  fecha: string; // YYYY-MM-DD
  entradas: MovimientoRemoto[];
  salidas: MovimientoRemoto[];
  cierre: CierreRemoto | null;
};

export const COLECCION_PANEL_REMOTO = "panelRemoto";

/** Clave usada para guardar/leer la caché offline de un día dado. */
export function claveCachePanelRemoto(fecha: string): string {
  return `panelRemoto:${fecha}`;
}

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
 *    documento no existe — estado válido ("sin cierre registrado hoy todavía"),
 *    no un fallo. Antes esto lanzaba el mismo error genérico que un fallo de red,
 *    así que cargar() en PanelRemotoClient.tsx no podía distinguirlos.
 *  - Lanza si falla la red, o si el SDK resolvió desde su propia caché interna en
 *    vez del servidor (getDoc() no lanza en ese caso — hay que revisar
 *    snap.metadata.fromCache explícitamente). Ese caso sí se trata igual que un
 *    fallo de red: el llamador debe caer a leerCacheRemoto().
 */
export async function traerPanelRemotoDeFirestore(fecha: string): Promise<PanelRemotoData | null> {
  const snap = await getDoc(doc(db, COLECCION_PANEL_REMOTO, fecha));

  if (snap.metadata.fromCache) {
    throw new Error(`Datos de ${fecha} vinieron de la caché interna de Firestore, no del servidor`);
  }

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as PanelRemotoData;
}
