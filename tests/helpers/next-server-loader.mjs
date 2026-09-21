// Permite importar proxy.ts desde `node --test`: "next/server" no se resuelve como
// módulo ESM (falta la extensión) y sus exports con nombre no se detectan, así que
// se reexportan desde un shim.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SHIM = pathToFileURL(path.join(AQUI, "next-server-shim.mjs")).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server" && context.parentURL !== SHIM) {
    return { url: SHIM, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
