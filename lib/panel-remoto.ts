import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Forma de los datos que el panel remoto de la gerente (app/gerente/remoto)
// espera encontrar en Firestore. Todavía no existe en este repo el proceso
// que escribe estos documentos (hoy export-dia.js solo genera CSV a
// OneDrive/Drive) — esta forma es el contrato que ese proceso deberá
// producir: colección "panelRemoto", un documento por día con id "YYYY-MM-DD".

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

const COLECCION = "panelRemoto";

/** Clave usada para guardar/leer la caché offline de un día dado. */
export function claveCachePanelRemoto(fecha: string): string {
  return `panelRemoto:${fecha}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function fechaHoy(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

/** Trae los datos del día desde Firestore. Lanza si el documento no existe o falla la red. */
export async function traerPanelRemotoDeFirestore(fecha: string): Promise<PanelRemotoData> {
  const snap = await getDoc(doc(db, COLECCION, fecha));

  if (!snap.exists()) {
    throw new Error(`No hay datos en Firestore para ${fecha}`);
  }

  return snap.data() as PanelRemotoData;
}
