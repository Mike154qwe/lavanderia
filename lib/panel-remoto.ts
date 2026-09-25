// Forma de los datos que sincroniza el panel remoto de la gerente
// (panel-remoto/, proyecto aparte desplegado en Firebase Hosting -- ver
// su README). Se escribe desde hacerCierreCaja (app/gerente/page.tsx) justo
// después de cada cierre de caja exitoso, vía lib/panel-remoto-admin.ts:
// colección "panelRemoto", un documento por día con id "YYYY-MM-DD".
//
// Este archivo solo tiene los TIPOS compartidos y helpers sin dependencias
// de Firestore -- la lectura (traerPanelRemotoDeFirestore) y la caché
// offline (claveCachePanelRemoto/fechaHoy, que la acompañaban) se borraron
// el 23-sep-2026 junto con app/gerente/remoto/: esa página nunca tuvo login
// propio, así que quedó rota sin arreglo simple en cuanto firestore.rules
// empezó a exigir autenticación para leer "panelRemoto" (21-sep-2026). El
// acceso remoto real de la gerente vive en panel-remoto/, que sí
// autentica con Firebase Auth.

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
  // Opcionales a propósito (23-sep-2026): hacerCierreCaja no los incluía
  // todavía cuando se migró la escritura al Admin SDK -- ver el commit de
  // este arreglo. panel-remoto/lib/panel-remoto.ts (proyecto aparte) ya
  // esperaba estos dos campos desde el backfill del 22-sep; el dashboard
  // ya sabe mostrar "—" si faltan (documentos viejos, de antes de este fix).
  gastosEfectivo?: number;
  efectivoEnCaja?: number;
};

export type PanelRemotoData = {
  fecha: string; // YYYY-MM-DD
  entradas: MovimientoRemoto[];
  salidas: MovimientoRemoto[];
  cierre: CierreRemoto | null;
};

export const COLECCION_PANEL_REMOTO = "panelRemoto";

/** Formatea una fecha como YYYY-MM-DD (hora local) — id del documento del día. */
export function formatearFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
