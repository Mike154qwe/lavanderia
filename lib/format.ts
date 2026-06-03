export function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}