import { Prisma } from "@prisma/client";

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
