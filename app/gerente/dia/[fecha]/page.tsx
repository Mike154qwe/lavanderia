import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { formatPedido, money } from "@/lib/format";
import { calcularCaja } from "@/lib/caja";
import { METODOS_PAGO, type MetodoPago } from "@/lib/types";
import { ESTADO_NOTIFICADO_LISTO } from "@/lib/whatsapp";

async function registrarGasto(formData: FormData) {
  "use server";

  const tipo = String(formData.get("tipo"));
  const descripcion = String(formData.get("descripcion") || "");
  const valor = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo") as MetodoPago;
  const responsable = String(formData.get("responsable") || "");
  const fecha = String(formData.get("fecha"));

  if (!tipo || valor <= 0 || !METODOS_PAGO.includes(metodo)) return;

  // Hora real de creación (createdAt default now() del esquema), no un sello fijo de
  // mediodía: un gasto registrado por la tarde debe caer en la ventana del cierre que
  // corresponda, igual que ya hace el formulario del empleado.
  await prisma.gastoCaja.create({
    data: { tipo, descripcion, valor, metodo, responsable },
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

  const pedidos = await prisma.pedido.findMany({
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
              // Solo cambios de estado reales cuentan como "actividad del día" --
              // el marcador de RF10 (ESTADO_NOTIFICADO_LISTO) no es un estado del
              // pedido y no debe hacer que un pedido de otro día aparezca aquí.
              estado: { not: ESTADO_NOTIFICADO_LISTO },
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

  const gastos = await prisma.gastoCaja.findMany({
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

  // Los pagos del día por SU fecha (createdAt), como en /gerente y en el cierre.
  // Antes «Recibido» sumaba todos los pagos de los pedidos creados ese día (aunque
  // se hubieran pagado otro día) y cambiaba con el buscador.
  const pagosDelDia = await prisma.pago.findMany({
    where: { createdAt: { gte: inicio, lt: fin } },
    select: { valor: true, metodo: true },
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

  const totalPrendas = pedidosFiltrados.reduce(
    (sum: number, pedido: any) =>
      sum +
      pedido.prendas.reduce((s: number, prenda: any) => s + prenda.cantidad, 0),
    0
  );

  // Los dos números de caja (lib/caja.ts): ganancia neta y efectivo en caja.
  const caja = calcularCaja(pagosDelDia, gastos);
  const { totalRecibido, totalGastos } = caja;

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
    <div className="space-y-5 p-6">
      <section className="space-y-5">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Finanzas del día</h1>

              <p className="mt-1 text-sm text-gray-500">
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
                className="btn-dark"
              >
                Limpiar
              </Link>
            )}
          </form>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Kpi title="Recibido" value={money(totalRecibido)} />
            <Kpi title="Vendido" value={money(totalVendido)} />
            <Kpi title="Gastos" value={money(totalGastos)} danger />
          </div>

          {/* Los dos números de caja, uno junto al otro. No son la misma cuenta. */}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Kpi
              title="Ganancia neta del día"
              hint="Todo lo recibido menos todos los gastos, en cualquier medio de pago."
              value={money(caja.gananciaNeta)}
              danger={caja.gananciaNeta < 0}
            />
            <Kpi
              title="Efectivo en caja"
              hint="Efectivo recibido menos solo los gastos pagados en efectivo. Para cuadrar el cajón."
              value={money(caja.efectivoEnCaja)}
              danger={caja.efectivoEnCaja < 0}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="card p-8">
            <h2 className="text-lg font-bold text-gray-900">Registrar gasto de caja</h2>

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

              <select name="metodo" defaultValue="Efectivo" className="input-modern">
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <input name="responsable" placeholder="Responsable" className="input-modern" />

              <button className="rounded-[10px] bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600">
                Registrar gasto
              </button>
            </form>
          </div>

          <div className="card p-8">
            <h2 className="text-lg font-bold text-gray-900">Cierre de caja</h2>

            <div className="mt-6 space-y-4">
              <CajaRow label="Dinero recibido" value={totalRecibido} />
              <CajaRow label="Gastos" value={totalGastos} danger />
              <CajaRow label="Ganancia neta del día" value={caja.gananciaNeta} strong />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400">Efectivo en caja</p>
            <div className="mt-3 space-y-4">
              <CajaRow label="Efectivo recibido" value={caja.efectivo} />
              <CajaRow label="Gastos pagados en efectivo" value={caja.gastosEfectivo} danger />
              <CajaRow label="Efectivo en caja" value={caja.efectivoEnCaja} strong />
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
            <h2 className="text-lg font-bold text-gray-900">Resumen operativo</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <Kpi title="Pedidos creados" value={pedidosCreados.length} />
              <Kpi title="Pedidos entregados" value={pedidosEntregados.length} />
              <Kpi title="Prendas gestionadas" value={totalPrendas} />
            </div>
          </div>
        </div>

        <div className="card mt-8 p-8">
          <h2 className="text-lg font-bold text-gray-900">Todos los movimientos del día</h2>

          <p className="mt-2 text-gray-500">
            Entradas, salidas, pagos, servicios y estado de cada recibo.
          </p>

          <div className="mt-6 space-y-5">
            {pedidosFiltrados.map((pedido: any) => (
              <PedidoDetalle key={pedido.id} pedido={pedido} />
            ))}

            {pedidosFiltrados.length === 0 && (
              <p className="text-center text-gray-500">
                No hubo movimientos este día.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
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
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-5">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            Recibo #{formatPedido(pedido.id)} - {pedido.cliente.nombre}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Tel: {pedido.cliente.telefono || "No registrado"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
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
        <h4 className="font-bold text-gray-800">Servicios</h4>

        <div className="mt-2 space-y-1">
          {pedido.prendas.map((prenda: any) => (
            <p key={prenda.id} className="text-sm text-gray-600">
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
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-800">{titulo}</p>

        <p className="font-bold text-red-600">
          -${valor.toLocaleString("es-CO")}
        </p>
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {descripcion || "Sin descripción"}
      </p>

      <p className="mt-1 text-xs text-gray-400">
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
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 dark:border-white/10">
      {text}
    </div>
  );
}

function Kpi({
  title,
  value,
  danger,
  hint,
}: {
  title: string;
  value: string | number;
  danger?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-5 dark:bg-white/[0.02]">
      <p className="text-sm text-gray-500">{title}</p>

      <p className={`mt-2 text-3xl font-black ${danger ? "text-red-600" : "text-brand-500"}`}>
        {value}
      </p>

      {hint && <p className="mt-1 text-xs leading-snug text-gray-400">{hint}</p>}
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
    <div className={`rounded-xl p-4 ${strong ? "bg-brand-50 dark:bg-brand-500/10" : "bg-gray-50 dark:bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-700">{label}</p>

        <p
          className={`text-2xl font-bold ${
            danger ? "text-red-600" : strong ? "text-brand-500" : "text-gray-900"
          }`}
        >
          {money(value)}
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
      <p className="text-sm text-gray-500">{label}</p>

      <p className={`mt-1 text-2xl font-black ${danger ? "text-red-600" : "text-brand-500"}`}>
        {money(value)}
      </p>
    </div>
  );
}