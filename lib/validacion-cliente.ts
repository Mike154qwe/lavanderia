// RNF04: saneamiento mínimo de datos personales antes de guardarlos. A
// propósito NO es validación estricta de números colombianos reales
// (indicativos, rangos de operador) -- eso rechazaría casos legítimos y
// frenaría al mostrador en medio de la atención al cliente. Solo evita
// basura evidente: caracteres sueltos donde debería haber dígitos, y
// strings sin límite de longitud en nombre/teléfono/dirección. Se sanea
// (limpia y recorta), nunca se bloquea la operación.

const TELEFONO_MAX = 20;
const NOMBRE_MAX = 120;
const DIRECCION_MAX = 200;

/** Quita espacios, guiones y paréntesis; conserva dígitos y un "+" inicial. Null si queda vacío. */
export function sanearTelefono(valor: string): string | null {
  const sinSeparadores = valor.trim().replace(/[\s\-()]/g, "");
  if (!sinSeparadores) return null;

  const signo = sinSeparadores.startsWith("+") ? "+" : "";
  const digitos = sinSeparadores.replace(/\D/g, "");
  if (!digitos) return null;

  return (signo + digitos).slice(0, TELEFONO_MAX);
}

/** Recorta espacios y longitud excesiva. */
export function sanearNombre(valor: string): string {
  return valor.trim().slice(0, NOMBRE_MAX);
}

/** Recorta espacios y longitud excesiva. Null si queda vacío. */
export function sanearDireccion(valor: string): string | null {
  const limpio = valor.trim().slice(0, DIRECCION_MAX);
  return limpio || null;
}
