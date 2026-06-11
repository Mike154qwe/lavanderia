import { Prisma } from "@prisma/client";

export const ESTADOS_PEDIDO = ["RECIBIDO", "EN_PROCESO", "LISTO", "ENTREGADO", "CANCELADO"] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const METODOS_PAGO = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export type PedidoConTodo = Prisma.PedidoGetPayload<{
  include: {
    cliente: true;
    prendas: { include: { entregasParciales: true } };
    pagos: true;
    historial: true;
  };
}>;

export type PedidoConPrendas = Prisma.PedidoGetPayload<{
  include: {
    cliente: true;
    prendas: true;
    pagos: true;
    historial: true;
  };
}>;

export type PedidoConAbono = Prisma.PedidoGetPayload<{
  include: {
    cliente: true;
    prendas: true;
    pagos: true;
  };
}>;

export type PagoConPedido = Prisma.PagoGetPayload<{
  include: { pedido: { include: { cliente: true } } };
}>;

export type { GastoCaja, CierreCaja, Cliente, Pedido, Prenda, Pago, HistorialEstado, EntregaParcial } from "@prisma/client";
