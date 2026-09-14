import { createStore, get, set } from "idb-keyval";

// Cambio de alcance (confirmado con la gerente): el registro de pedidos
// corre en un único dispositivo local, así que nunca hay una red que se
// pueda caer entre el navegador y el servidor — son la misma máquina. Por
// eso no existe (ni hace falta) una cola de escritura offline para pedidos;
// ver el revert en NuevoPedidoForm.tsx.
//
// Este módulo es para el caso real: un panel remoto de SOLO LECTURA que la
// gerente abre desde su celular, fuera del negocio, para consultar
// movimientos y cierres de caja. Guarda en IndexedDB la última copia
// conocida de esos datos (los que lleguen de la fuente remota, ej.
// Firestore) para que el panel siga mostrando algo útil si el celular
// pierde conexión a medio camino. Es una caché de LECTURA, no una cola de
// escritura — no hay nada que sincronizar de vuelta al servidor desde acá.

const store = createStore("lavanderia-remote-cache", "lecturas");

export type CacheRemoto<T> = {
  datos: T;
  actualizadoEn: number;
};

/** Guarda (o reemplaza) la última copia conocida de `datos` bajo `clave`. */
export async function guardarCacheRemoto<T>(clave: string, datos: T): Promise<void> {
  const entrada: CacheRemoto<T> = { datos, actualizadoEn: Date.now() };
  await set(clave, entrada, store);
}

/** Lee la última copia guardada bajo `clave`, o undefined si nunca se guardó. */
export async function leerCacheRemoto<T>(clave: string): Promise<CacheRemoto<T> | undefined> {
  return get<CacheRemoto<T>>(clave, store);
}
