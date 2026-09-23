// Subconjunto de lavanderia-local/lib/format.ts -- solo lo que usa el panel
// remoto (money, fmt). Copiado a mano, no importado entre proyectos: son dos
// despliegues separados (ver README.md).

export function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

export const fmt = formatPedido;

/** Formatea pesos. El signo va antes del símbolo: -$182.500, no $-182.500. */
export function money(value: number) {
  const abs = Math.abs(value).toLocaleString("es-CO");
  return value < 0 ? `-$${abs}` : `$${abs}`;
}
