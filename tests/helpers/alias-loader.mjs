// Cargador mínimo para ejecutar código de la app (TypeScript, alias "@/") desde
// `node --test`, sin instalar nada: Node 24 ya entiende TypeScript sin tipos.
//   - "@/x"            -> <raíz>/x(.ts|.tsx|/index.ts)
//   - "@prisma/client" -> un shim ESM (el paquete es CommonJS y Node no detecta
//                         sus exports con nombre).
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHIM = pathToFileURL(path.join(RAIZ, "tests/helpers/prisma-client-shim.mjs")).href;

const esArchivo = (p) => existsSync(p) && statSync(p).isFile();

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@prisma/client" && context.parentURL !== SHIM) {
    return { url: SHIM, shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const base = path.join(RAIZ, specifier.slice(2));
    for (const candidato of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (esArchivo(candidato)) {
        return nextResolve(pathToFileURL(candidato).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}
