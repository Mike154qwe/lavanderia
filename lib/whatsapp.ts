/**
 * Construye un link de wa.me para escribirle a un cliente sobre un pedido puntual.
 * Antepone el indicativo de Colombia (57) si el teléfono no lo trae ya. Si no hay
 * teléfono, devuelve "#" (enlace inerte; quien lo use debe deshabilitar el botón).
 *
 * `pedidoId` no entra en el link (wa.me solo toma teléfono y texto): se recibe
 * aparte del mensaje ya armado para que quien registre el envío (p. ej. RF10, al
 * marcar un pedido como notificado) lo tenga a mano sin tener que parsear `texto`.
 */
export function whatsappLink(telefono: string | null, pedidoId: number, texto: string) {
  if (!telefono) return "#";

  const limpio = telefono.replace(/\D/g, "");
  const numero = limpio.startsWith("57") ? limpio : `57${limpio}`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
