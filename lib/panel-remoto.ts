import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Forma de los datos que el panel remoto de la gerente (app/gerente/remoto)
// espera encontrar en Firestore. Se escribe desde hacerCierreCaja
// (app/gerente/page.tsx) justo después de cada cierre de caja exitoso:
// colección "panelRemoto", un documento por día con id "YYYY-MM-DD".

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

/** Formatea una fecha como YYYY-MM-DD (hora local) — id del documento del día. */
export function formatearFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function fechaHoy(): string {
  return formatearFecha(new Date());
}

/** Trae los datos del día desde Firestore. Lanza si el documento no existe o falla la red. */
export async function traerPanelRemotoDeFirestore(fecha: string): Promise<PanelRemotoData> {
  const snap = await getDoc(doc(db, COLECCION, fecha));

  if (!snap.exists()) {
    throw new Error(`No hay datos en Firestore para ${fecha}`);
  }

  return snap.data() as PanelRemotoData;
}

/** Reemplaza el documento del día con los datos dados. Propaga cualquier error de red. */
export async function guardarPanelRemotoEnFirestore(datos: PanelRemotoData): Promise<void> {
  await setDoc(doc(db, COLECCION, datos.fecha), datos);
}
