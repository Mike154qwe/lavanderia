export function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

/** Alias corto para formatPedido */
export const fmt = formatPedido;

export function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

export const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO:   "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  EN_PROCESO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  LISTO:      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  ENTREGADO:  "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
  CANCELADO:  "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
};
