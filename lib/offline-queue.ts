import { createStore, del, entries, set } from "idb-keyval";

// RNF02 (cola de sincronización offline): módulo aislado para guardar
// pedidos en IndexedDB cuando el dispositivo no tiene conexión. Cada pedido
// se encola con un id temporal generado en el cliente; más adelante, un
// proceso de sincronización (todavía no implementado) recorrerá esta cola,
// hará POST a /api/pedidos por cada uno y, si el servidor confirma la
// creación, lo quitará con eliminarDePendientes(idTemporal).
//
// Este módulo todavía NO está conectado a NuevoPedidoForm.tsx ni a ningún
// otro componente — es solo la pieza de almacenamiento local.

const store = createStore("lavanderia-offline", "pedidos-pendientes");

export type PrendaPendiente = {
  servicio: string;
  tipo: string;
  descripcion: string;
  cantidad: string;
  valor: string;
};

export type PedidoPendiente = {
  clienteId: string;
  observacion: string;
  abono: string;
  metodo: string;
  prendas: PrendaPendiente[];
};

export type PedidoEncolado = {
  idTemporal: string;
  datos: PedidoPendiente;
  createdAt: number;
};

function generarIdTemporal(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Guarda un pedido en la cola local (IndexedDB) y devuelve el idTemporal asignado. */
export async function encolarPedido(datos: PedidoPendiente): Promise<string> {
  const idTemporal = generarIdTemporal();
  const pedido: PedidoEncolado = { idTemporal, datos, createdAt: Date.now() };
  await set(idTemporal, pedido, store);
  return idTemporal;
}

/** Devuelve todos los pedidos pendientes de sincronizar, del más antiguo al más nuevo. */
export async function obtenerPendientes(): Promise<PedidoEncolado[]> {
  const pares = await entries<string, PedidoEncolado>(store);
  return pares.map(([, pedido]) => pedido).sort((a, b) => a.createdAt - b.createdAt);
}

/** Quita un pedido de la cola local, normalmente tras confirmar que ya se sincronizó. */
export async function eliminarDePendientes(idTemporal: string): Promise<void> {
  await del(idTemporal, store);
}
