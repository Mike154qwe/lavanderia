import { del, get, set } from "idb-keyval";

export const CLAVES_CACHE_REMOTO = {
  movimientosDia: "movimientos-dia",
  ultimoCierre: "ultimo-cierre",
} as const;

export type ClaveCacheRemoto =
  (typeof CLAVES_CACHE_REMOTO)[keyof typeof CLAVES_CACHE_REMOTO];

export type EntradaCacheRemoto<T = unknown> = {
  datos: T;
  actualizadoEn: string;
};

function disponibleEnNavegador() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function esEntradaCacheRemoto<T>(valor: unknown): valor is EntradaCacheRemoto<T> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "datos" in valor &&
    "actualizadoEn" in valor &&
    typeof (valor as { actualizadoEn: unknown }).actualizadoEn === "string"
  );
}

export async function guardarCacheRemoto<T>(clave: string, datos: T): Promise<void> {
  if (!disponibleEnNavegador()) {
    throw new Error(
      "guardarCacheRemoto solo puede ejecutarse en el navegador. IndexedDB no está disponible en el servidor."
    );
  }

  const entrada: EntradaCacheRemoto<T> = {
    datos,
    actualizadoEn: new Date().toISOString(),
  };

  await set(clave, entrada);
}

export async function leerCacheRemoto<T>(clave: string): Promise<EntradaCacheRemoto<T> | null> {
  if (!disponibleEnNavegador()) {
    return null;
  }

  const valor = await get(clave);
  if (!esEntradaCacheRemoto<T>(valor)) {
    return null;
  }

  return valor;
}

export async function borrarCacheRemoto(clave: string): Promise<void> {
  if (!disponibleEnNavegador()) {
    return;
  }

  await del(clave);
}

export function etiquetaUltimaActualizacion(
  entrada: EntradaCacheRemoto | null | undefined
): string {
  if (!entrada?.actualizadoEn) {
    return "Sin datos en caché";
  }

  const fecha = new Date(entrada.actualizadoEn);
  if (Number.isNaN(fecha.getTime())) {
    return "Sin datos en caché";
  }

  return `Última actualización: ${fecha.toLocaleString("es-CO")}`;
}
