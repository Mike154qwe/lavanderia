import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import MoneyInput from "@/components/MoneyInput";

const PAGE_SIZE = 25;

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function buildUrl(page: number, q: string, estado: string) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (estado && estado !== "TODOS") params.set("estado", estado);
  params.set("page", String(page));

  return `/inventario?${params.toString()}`;
}

async function agregarAbono(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedidoId"));
  const valor = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo");

  if (!pedidoId || valor <= 0) return;

  await prisma.pago.create({
    data: {
      pedidoId,
      valor,
      metodo,
    },
  });

  revalidatePath("/inventario");
  revalidatePath("/empleado");
  revalidatePath("/gerente");
}

async function registrarEntregaParcial(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedidoId"));
  const prendaId = Number(formData.get("prendaId"));
  const cantidad = Number(formData.get("cantidad"));
  const observacion = String(formData.get("observacion") || "");
  const abono = Number(String(formData.get("abono") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo");

  if (!pedidoId || !prendaId || cantidad <= 0) return;

  const pedido: any = await (prisma as any).pedido.findUnique({
    where: { id: pedidoId },
    include: {
      pagos: true,
      prendas: {
        include: {
          entregasParciales: true,
        },
      },
    },
  });

  if (!pedido) return;

  const prenda = pedido.prendas.find((p: any) => p.id === prendaId);
  if (!prenda) return;

  const entregadas = prenda.entregasParciales.reduce(
    (sum: number, entrega: any) => sum + entrega.cantidad,
    0
  );

  const pendientes = prenda.cantidad - entregadas;

  if (cantidad > pendientes) return;

  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const saldo = pedido.total - abonado;

  if (saldo > 0 && abono <= 0) return;

  if (abono > 0) {
    await prisma.pago.create({
      data: {
        pedidoId,
        valor: abono,
        metodo,
      },
    });
  }

  await (prisma as any).entregaParcial.create({
    data: {
      pedidoId,
      prendaId,
      cantidad,
      observacion,
    },
  });

  const actualizado: any = await (prisma as any).pedido.findUnique({
    where: { id: pedidoId },
    include: {
      prendas: {
        include: {
          entregasParciales: true,
        },
      },
    },
  });

  if (actualizado) {
    const todoEntregado = actualizado.prendas.every((p: any) => {
      const totalEntregado = p.entregasParciales.reduce(
        (sum: number, entrega: any) => sum + entrega.cantidad,
        0
      );

      return totalEntregado >= p.cantidad;
    });

    if (todoEntregado) {
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { estado: "ENTREGADO" },
      });

      await (prisma as any).historialEstado.create({
        data: {
          pedidoId,
          estado: "ENTREGADO",
        },
      });
    }
  }

  revalidatePath("/inventario");
  revalidatePath("/empleado");
  revalidatePath("/gerente");
}

async function cambiarEstado(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedidoId"));
  const nuevoEstado = String(formData.get("nuevoEstado")) as
    | "RECIBIDO"
    | "LISTO"
    | "ENTREGADO"
    | "CANCELADO";

  if (!pedidoId) return;

  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { estado: nuevoEstado },
  });

  await (prisma as any).historialEstado.create({
    data: {
      pedidoId,
      estado: nuevoEstado,
    },
  });

  revalidatePath("/inventario");
  revalidatePath("/empleado");
  revalidatePath("/gerente");
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}) {
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const estadoFiltro = params.estado || "TODOS";
  const currentPage = Math.max(Number(params.page || "1"), 1);

  const baseWhere: any = {
    estado: {
      notIn: ["ENTREGADO", "CANCELADO"],
    },
  };

  if (estadoFiltro === "RECIBIDO" || estadoFiltro === "LISTO") {
    baseWhere.estado = estadoFiltro;
  }

  if (q) {
    const idNumber = Number(q);

    baseWhere.OR = [
      ...(Number.isFinite(idNumber) && idNumber > 0
        ? [{ id: idNumber }]
        : []),
      {
        cliente: {
          nombre: {
            contains: q,
          },
        },
      },
      {
        cliente: {
          telefono: {
            contains: q,
          },
        },
      },
    ];
  }

  const requiereFiltroSaldo =
    estadoFiltro === "CON_SALDO" || estadoFiltro === "PAGADOS";

  let pedidosFiltrados: any[] = [];
  let totalPedidosBase = 0;

  if (requiereFiltroSaldo) {
    const todos: any[] = await (prisma as any).pedido.findMany({
      where: baseWhere,
      include: {
        cliente: true,
        pagos: true,
        historial: true,
        prendas: {
          include: {
            entregasParciales: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const filtradosPorSaldo = todos.filter((pedido: any) => {
      const abonado = pedido.pagos.reduce(
        (sum: number, pago: any) => sum + pago.valor,
        0
      );

      const saldo = pedido.total - abonado;

      if (estadoFiltro === "CON_SALDO") return saldo > 0;
      if (estadoFiltro === "PAGADOS") return saldo <= 0;

      return true;
    });

    totalPedidosBase = filtradosPorSaldo.length;

    pedidosFiltrados = filtradosPorSaldo.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  } else {
    totalPedidosBase = await (prisma as any).pedido.count({
      where: baseWhere,
    });

    pedidosFiltrados = await (prisma as any).pedido.findMany({
      where: baseWhere,
      include: {
        cliente: true,
        pagos: true,
        historial: true,
        prendas: {
          include: {
            entregasParciales: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  const totalPages = Math.max(Math.ceil(totalPedidosBase / PAGE_SIZE), 1);

  const totalPrendasPendientes = pedidosFiltrados.reduce(
    (sum: number, pedido: any) =>
      sum +
      pedido.prendas.reduce((s: number, prenda: any) => {
        const entregadas = prenda.entregasParciales.reduce(
          (eSum: number, entrega: any) => eSum + entrega.cantidad,
          0
        );

        return s + Math.max(prenda.cantidad - entregadas, 0);
      }, 0),
    0
  );

  const conSaldo = pedidosFiltrados.filter((pedido: any) => {
    const abonado = pedido.pagos.reduce(
      (sum: number, pago: any) => sum + pago.valor,
      0
    );

    return pedido.total - abonado > 0;
  }).length;

  const listos = pedidosFiltrados.filter(
    (pedido: any) => pedido.estado === "LISTO"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="p-8">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Inventario en piso
              </h1>

              <p className="mt-2 text-slate-500">
                Mostrando {pedidosFiltrados.length} de {totalPedidosBase}{" "}
                pedidos activos.
              </p>
            </div>

            <Link
              href="/pedidos/nuevo"
              className="rounded-2xl bg-teal-500 px-6 py-4 font-bold text-white shadow hover:bg-teal-600"
            >
              Nueva entrada
            </Link>
          </div>

          <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_120px_120px]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por pedido, cliente o teléfono"
              className="rounded-2xl border p-4"
            />

            <select
              name="estado"
              defaultValue={estadoFiltro}
              className="rounded-2xl border p-4"
            >
              <option value="TODOS">Todos</option>
              <option value="RECIBIDO">Recibidos</option>
              <option value="LISTO">Listos</option>
              <option value="CON_SALDO">Con saldo</option>
              <option value="PAGADOS">Pagados</option>
            </select>

            <button className="rounded-2xl bg-teal-500 px-5 py-4 font-bold text-white hover:bg-teal-600">
              Buscar
            </button>

            <Link
              href="/inventario"
              className="rounded-2xl bg-slate-200 px-5 py-4 text-center font-bold text-slate-700 hover:bg-slate-300"
            >
              Limpiar
            </Link>
          </form>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          <Kpi title="Pedidos página" value={pedidosFiltrados.length} />
          <Kpi title="Prendas pendientes" value={totalPrendasPendientes} />
          <Kpi title="Con saldo página" value={conSaldo} danger />
          <Kpi title="Listos página" value={listos} />
        </div>

        <div className="mt-8 space-y-6">
          {pedidosFiltrados.map((pedido: any) => (
            <PedidoInventario key={pedido.id} pedido={pedido} />
          ))}

          {pedidosFiltrados.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow">
              No se encontraron pedidos en inventario.
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-3xl bg-white p-6 shadow">
          <Link
            href={buildUrl(Math.max(currentPage - 1, 1), q, estadoFiltro)}
            className={`rounded-2xl px-5 py-3 font-bold ${
              currentPage === 1
                ? "pointer-events-none bg-slate-100 text-slate-400"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            Anterior
          </Link>

          <span className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-700">
            Página {currentPage} de {totalPages}
          </span>

          <Link
            href={buildUrl(
              Math.min(currentPage + 1, totalPages),
              q,
              estadoFiltro
            )}
            className={`rounded-2xl px-5 py-3 font-bold ${
              currentPage >= totalPages
                ? "pointer-events-none bg-slate-100 text-slate-400"
                : "bg-teal-500 text-white hover:bg-teal-600"
            }`}
          >
            Siguiente
          </Link>
        </div>
      </section>
    </main>
  );
}

function PedidoInventario({ pedido }: { pedido: any }) {
  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const saldo = pedido.total - abonado;

  const prendasRecibidas = pedido.prendas.reduce(
    (sum: number, prenda: any) => sum + prenda.cantidad,
    0
  );

  const prendasEntregadas = pedido.prendas.reduce((sum: number, prenda: any) => {
    const entregadas = prenda.entregasParciales.reduce(
      (s: number, entrega: any) => s + entrega.cantidad,
      0
    );

    return sum + entregadas;
  }, 0);

  const prendasPendientes = prendasRecibidas - prendasEntregadas;

  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Pedido #{formatPedido(pedido.id)} - {pedido.cliente.nombre}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tel: {pedido.cliente.telefono || "No registrado"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Dirección: {pedido.cliente.direccion || "No registrada"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Entrada: {pedido.createdAt.toLocaleDateString("es-CO")}{" "}
            {pedido.createdAt.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <span className="rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-700">
          {pedido.estado}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        <InfoBox title="Prendas recibidas" value={prendasRecibidas} />
        <InfoBox title="Retiradas" value={prendasEntregadas} />
        <InfoBox title="Pendientes" value={prendasPendientes} />
        <MoneyBox title="Total" value={pedido.total} />
        <MoneyBox title="Abonado" value={abonado} />
        <MoneyBox title="Saldo" value={saldo} danger={saldo > 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border bg-slate-50 p-5">
          <h3 className="text-xl font-bold text-slate-900">
            Prendas y retiros parciales
          </h3>

          <div className="mt-5 space-y-4">
            {pedido.prendas.map((prenda: any) => {
              const entregadas = prenda.entregasParciales.reduce(
                (sum: number, entrega: any) => sum + entrega.cantidad,
                0
              );

              const pendientes = prenda.cantidad - entregadas;

              return (
                <div key={prenda.id} className="rounded-2xl bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">
                        {prenda.servicio ?? "Lavado"} - {prenda.tipo}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Recibidas: {prenda.cantidad} · Retiradas: {entregadas} ·
                        Pendientes: <b>{pendientes}</b>
                      </p>

                      {prenda.descripcion && (
                        <p className="mt-1 text-sm text-slate-400">
                          {prenda.descripcion}
                        </p>
                      )}
                    </div>

                    <p className="font-bold text-teal-600">
                      ${(prenda.valor ?? 0).toLocaleString("es-CO")}
                    </p>
                  </div>

                  {prenda.entregasParciales.length > 0 && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-bold text-slate-700">
                        Historial de retiros
                      </p>

                      <div className="mt-2 space-y-1">
                        {prenda.entregasParciales.map((entrega: any) => (
                          <p key={entrega.id} className="text-sm text-slate-500">
                            {entrega.cantidad} retiradas ·{" "}
                            {entrega.createdAt.toLocaleDateString("es-CO")}{" "}
                            {entrega.createdAt.toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {entrega.observacion
                              ? ` · ${entrega.observacion}`
                              : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendientes > 0 ? (
                    <details className="mt-4">
                      <summary className="cursor-pointer rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                        Retirar parcialmente esta prenda
                      </summary>

                      <form
                        action={registrarEntregaParcial}
                        className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"
                      >
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="prendaId" value={prenda.id} />

                        <input
                          name="cantidad"
                          type="number"
                          min="1"
                          max={pendientes}
                          required
                          placeholder={`Cantidad a retirar. Máx ${pendientes}`}
                          className="rounded-xl border p-3 text-sm"
                        />

                        {saldo > 0 && (
                          <MoneyInput
                            name="abono"
                            placeholder="Abono obligatorio"
                          />
                        )}

                        <select
                          name="metodo"
                          className="rounded-xl border p-3 text-sm"
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Nequi">Nequi</option>
                          <option value="Daviplata">Daviplata</option>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta">Tarjeta</option>
                        </select>

                        <input
                          name="observacion"
                          placeholder="Observación del retiro"
                          className="rounded-xl border p-3 text-sm"
                        />

                        <button className="rounded-xl bg-teal-500 px-4 py-3 text-sm font-bold text-white hover:bg-teal-600 md:col-span-2">
                          Confirmar retiro parcial
                        </button>
                      </form>
                    </details>
                  ) : (
                    <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-600">
                      Esta prenda ya fue retirada completamente.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border bg-slate-50 p-5">
            <h3 className="text-xl font-bold text-slate-900">
              Abonos del pedido
            </h3>

            <div className="mt-4 space-y-3">
              {pedido.pagos.map((pago: any) => (
                <div key={pago.id} className="rounded-2xl bg-white p-4">
                  <p className="font-bold text-teal-600">
                    ${pago.valor.toLocaleString("es-CO")}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">{pago.metodo}</p>

                  <p className="mt-1 text-xs text-slate-400">
                    {pago.createdAt.toLocaleDateString("es-CO")}{" "}
                    {pago.createdAt.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}

              {pedido.pagos.length === 0 && (
                <p className="text-sm text-slate-500">
                  No hay abonos registrados.
                </p>
              )}
            </div>

            {saldo > 0 && (
              <form action={agregarAbono} className="mt-5 grid gap-3">
                <input type="hidden" name="pedidoId" value={pedido.id} />

                <MoneyInput
                  name="valor"
                  placeholder={`Abono. Saldo: ${saldo.toLocaleString("es-CO")}`}
                />

                <select name="metodo" className="rounded-xl border p-3 text-sm">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>

                <button className="rounded-xl bg-teal-500 px-4 py-3 text-sm font-bold text-white hover:bg-teal-600">
                  Registrar abono
                </button>
              </form>
            )}
          </div>

          <div className="rounded-3xl border bg-slate-50 p-5">
            <h3 className="text-xl font-bold text-slate-900">
              Acciones del pedido
            </h3>

            <div className="mt-4 grid gap-3">
              {pedido.estado === "RECIBIDO" && (
                <EstadoForm
                  pedidoId={pedido.id}
                  nuevoEstado="LISTO"
                  label="Marcar pedido listo"
                />
              )}

              {pedido.estado === "LISTO" && saldo <= 0 && (
                <EstadoForm
                  pedidoId={pedido.id}
                  nuevoEstado="ENTREGADO"
                  label="Entregar todo el pedido"
                />
              )}

              {pedido.estado === "LISTO" && saldo > 0 && (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
                  Para entregar todo el pedido debe pagar el saldo. También puede
                  hacer retiro parcial con abono.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EstadoForm({
  pedidoId,
  nuevoEstado,
  label,
}: {
  pedidoId: number;
  nuevoEstado: string;
  label: string;
}) {
  return (
    <form action={cambiarEstado}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="nuevoEstado" value={nuevoEstado} />

      <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
        {label}
      </button>
    </form>
  );
}

function Kpi({
  title,
  value,
  danger,
}: {
  title: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <p className="text-sm text-slate-500">{title}</p>

      <p
        className={`mt-3 text-4xl font-bold ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MoneyBox({
  title,
  value,
  danger,
}: {
  title: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{title}</p>

      <p
        className={`mt-1 text-2xl font-bold ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        ${value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}