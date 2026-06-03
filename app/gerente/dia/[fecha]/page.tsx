import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

async function registrarGasto(formData: FormData) {
  "use server";

  const tipo = String(formData.get("tipo"));
  const descripcion = String(formData.get("descripcion") || "");
  const valor = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo");
  const responsable = String(formData.get("responsable") || "");
  const fecha = String(formData.get("fecha"));

  if (!tipo || valor <= 0) return;

  await (prisma as any).gastoCaja.create({
    data: {
      tipo,
      descripcion,
      valor,
      metodo,
      responsable,
      createdAt: new Date(fecha + "T12:00:00"),
    },
  });

  revalidatePath(`/gerente/dia/${fecha}`);
  revalidatePath("/gerente");
}

export default async function DiaFinanzasPage({
  params,
  searchParams,
}: {
  params: Promise<{ fecha: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { fecha: fechaParam } = await params;
  const filtros = await searchParams;
  const q = filtros.q?.trim().toLowerCase() || "";

  const fecha = new Date(fechaParam + "T00:00:00");
  const inicio = new Date(fecha);
  const fin = new Date(fecha);
  fin.setDate(fin.getDate() + 1);

  const pedidos: any[] = await (prisma as any).pedido.findMany({
    where: {
      OR: [
        {
          createdAt: {
            gte: inicio,
            lt: fin,
          },
        },
        {
          historial: {
            some: {
              createdAt: {
                gte: inicio,
                lt: fin,
              },
            },
          },
        },
      ],
    },
    include: {
      cliente: true,
      prendas: true,
      pagos: true,
      historial: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const gastos: any[] = await (prisma as any).gastoCaja.findMany({
    where: {
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const pedidosFiltrados = q
    ? pedidos.filter((pedido: any) => {
        const id = String(pedido.id);
        const idFormateado = formatPedido(pedido.id);
        const nombre = pedido.cliente.nombre.toLowerCase();
        const telefono = pedido.cliente.telefono?.toLowerCase() || "";

        return (
          id.includes(q) ||
          idFormateado.includes(q) ||
          nombre.includes(q) ||
          telefono.includes(q)
        );
      })
    : pedidos;

  const totalVendido = pedidosFiltrados.reduce(
    (sum: number, pedido: any) => sum + pedido.total,
    0
  );

  const totalRecibido = pedidosFiltrados.reduce(
    (sum: number, pedido: any) =>
      sum +
      pedido.pagos.reduce((s: number, pago: any) => s + pago.valor, 0),
    0
  );

  const totalPrendas = pedidosFiltrados.reduce(
    (sum: number, pedido: any) =>
      sum +
      pedido.prendas.reduce((s: number, prenda: any) => s + prenda.cantidad, 0),
    0
  );

  const totalGastos = gastos.reduce(
    (sum: number, gasto: any) => sum + gasto.valor,
    0
  );

  const cajaEsperada = totalRecibido - totalGastos;

  const pedidosCreados = pedidosFiltrados.filter(
    (pedido: any) => pedido.createdAt >= inicio && pedido.createdAt < fin
  );

  const pedidosEntregados = pedidosFiltrados.filter((pedido: any) =>
    pedido.historial.some(
      (h: any) =>
        h.estado === "ENTREGADO" && h.createdAt >= inicio && h.createdAt < fin
    )
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <section className="ml-72 p-8">
        <div className="card p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h1 className="title-xl text-slate-900">Finanzas del día</h1>

              <p className="mt-2 text-slate-500">
                {fecha.toLocaleDateString("es-CO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <Link href="/gerente" className="btn-dark">
              Volver
            </Link>
          </div>

          <form className="mt-6 flex gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por pedido, cliente o teléfono"
              className="input-modern max-w-xl"
            />

            <button className="btn-primary">Buscar</button>

            {q && (
              <Link
                href={`/gerente/dia/${fechaParam}`}
                className="rounded-2xl bg-slate-200 px-6 py-4 font-bold text-slate-700 hover:bg-slate-300"
              >
                Limpiar
              </Link>
            )}
          </form>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <Kpi title="Recibido" value={`$${totalRecibido.toLocaleString("es-CO")}`} />
            <Kpi title="Vendido" value={`$${totalVendido.toLocaleString("es-CO")}`} />
            <Kpi title="Gastos" value={`$${totalGastos.toLocaleString("es-CO")}`} danger />
            <Kpi title="Caja esperada" value={`$${cajaEsperada.toLocaleString("es-CO")}`} />
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="card p-8">
            <h2 className="title-lg text-slate-900">Registrar gasto de caja</h2>

            <form action={registrarGasto} className="mt-6 grid gap-4">
              <input type="hidden" name="fecha" value={fechaParam} />

              <select name="tipo" required className="input-modern">
                <option value="">Tipo de gasto</option>
                <option value="Nómina">Nómina</option>
                <option value="Pago prensista">Pago prensista</option>
                <option value="Jabones">Jabones</option>
                <option value="Insumos">Insumos</option>
                <option value="Pago empleado">Pago empleado</option>
                <option value="Novedad">Novedad</option>
                <option value="Otro">Otro</option>
              </select>

              <input name="descripcion" placeholder="Descripción" className="input-modern" />

              <input
                name="valor"
                type="number"
                min="0"
                step="1000"
                required
                placeholder="Valor"
                className="input-modern"
              />

              <select name="metodo" className="input-modern">
                <option value="Efectivo">Efectivo</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Transferencia">Transferencia</option>
              </select>

              <input name="responsable" placeholder="Responsable" className="input-modern" />

              <button className="rounded-2xl bg-red-500 px-6 py-4 font-bold text-white hover:bg-red-600">
                Registrar gasto
              </button>
            </form>
          </div>

          <div className="card p-8">
            <h2 className="title-lg text-slate-900">Cierre de caja</h2>

            <div className="mt-6 space-y-4">
              <CajaRow label="Dinero recibido" value={totalRecibido} />
              <CajaRow label="Gastos" value={totalGastos} danger />
              <CajaRow label="Caja esperada" value={cajaEsperada} strong />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <Panel title="Gastos del día">
            {gastos.map((gasto: any) => (
              <MovimientoCaja
                key={gasto.id}
                titulo={gasto.tipo}
                descripcion={gasto.descripcion}
                valor={gasto.valor}
                metodo={gasto.metodo}
                responsable={gasto.responsable}
                fecha={gasto.createdAt}
              />
            ))}

            {gastos.length === 0 && <Empty text="No hay gastos registrados." />}
          </Panel>

          <div className="card p-8">
            <h2 className="title-lg text-slate-900">Resumen operativo</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <Kpi title="Pedidos creados" value={pedidosCreados.length} />
              <Kpi title="Pedidos entregados" value={pedidosEntregados.length} />
              <Kpi title="Prendas gestionadas" value={totalPrendas} />
            </div>
          </div>
        </div>

        <div className="card mt-8 p-8">
          <h2 className="title-lg text-slate-900">Todos los movimientos del día</h2>

          <p className="mt-2 text-slate-500">
            Entradas, salidas, pagos, servicios y estado de cada recibo.
          </p>

          <div className="mt-6 space-y-5">
            {pedidosFiltrados.map((pedido: any) => (
              <PedidoDetalle key={pedido.id} pedido={pedido} />
            ))}

            {pedidosFiltrados.length === 0 && (
              <p className="text-center text-slate-500">
                No hubo movimientos este día.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PedidoDetalle({ pedido }: { pedido: any }) {
  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const saldo = pedido.total - abonado;

  const entrega = pedido.historial.find((h: any) => h.estado === "ENTREGADO");

  return (
    <div className="rounded-3xl border bg-slate-50 p-6">
      <div className="flex items-center justify-between gap-5">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Recibo #{formatPedido(pedido.id)} - {pedido.cliente.nombre}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Tel: {pedido.cliente.telefono || "No registrado"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Creado: {pedido.createdAt.toLocaleDateString("es-CO")}{" "}
            {pedido.createdAt.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {entrega ? (
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              Entregado: {entrega.createdAt.toLocaleDateString("es-CO")}{" "}
              {entrega.createdAt.toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-orange-600">
              No ha sido entregado
            </p>
          )}
        </div>

        <span className="badge badge-success">{pedido.estado}</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Money label="Total" value={pedido.total} />
        <Money label="Abonado" value={abonado} />
        <Money label="Saldo" value={saldo} danger={saldo > 0} />
      </div>

      <div className="mt-5">
        <h4 className="font-bold text-slate-800">Servicios</h4>

        <div className="mt-2 space-y-1">
          {pedido.prendas.map((prenda: any) => (
            <p key={prenda.id} className="text-sm text-slate-600">
              {prenda.servicio ?? "Lavado"} - {prenda.tipo} x {prenda.cantidad} - $
              {prenda.valor.toLocaleString("es-CO")}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function MovimientoCaja({
  titulo,
  descripcion,
  valor,
  metodo,
  responsable,
  fecha,
}: {
  titulo: string;
  descripcion?: string;
  valor: number;
  metodo?: string;
  responsable?: string;
  fecha: Date;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-800">{titulo}</p>

        <p className="font-bold text-red-600">
          -${valor.toLocaleString("es-CO")}
        </p>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {descripcion || "Sin descripción"}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {metodo || "Sin método"} · {responsable || "Sin responsable"} ·{" "}
        {fecha.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-8">
      <h2 className="title-lg text-slate-900">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function Kpi({
  title,
  value,
  danger,
}: {
  title: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-slate-100 p-5">
      <p className="text-sm text-slate-500">{title}</p>

      <p className={`mt-2 text-3xl font-bold ${danger ? "text-red-600" : "text-teal-600"}`}>
        {value}
      </p>
    </div>
  );
}

function CajaRow({
  label,
  value,
  danger,
  strong,
}: {
  label: string;
  value: number;
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ${strong ? "bg-teal-50" : "bg-slate-50"}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-700">{label}</p>

        <p
          className={`text-2xl font-bold ${
            danger ? "text-red-600" : strong ? "text-teal-600" : "text-slate-900"
          }`}
        >
          ${value.toLocaleString("es-CO")}
        </p>
      </div>
    </div>
  );
}

function Money({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>

      <p className={`mt-1 text-2xl font-bold ${danger ? "text-red-600" : "text-teal-600"}`}>
        ${value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}