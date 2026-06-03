import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

async function crearPedido(formData: FormData) {
  "use server";

  const nombreCliente = String(formData.get("nombreCliente"));
  const telefono = String(formData.get("telefono") || "");
  const direccion = String(formData.get("direccion") || "");

  const servicio = String(formData.get("servicio"));
  const tipoPrenda = String(formData.get("tipoPrenda"));
  const descripcion = String(formData.get("descripcion") || "");
  const cantidad = Number(formData.get("cantidad"));
  const total = Number(formData.get("total"));
  const abono = Number(formData.get("abono") || 0);
  const metodoPago = String(formData.get("metodoPago") || "Efectivo");

  await prisma.pedido.create({
    data: {
      servicio,
      total,
      observacion: String(formData.get("observacion") || ""),

      cliente: {
        create: {
          nombre: nombreCliente,
          telefono,
          direccion,
        },
      },

      prendas: {
        create: {
          tipo: tipoPrenda,
          cantidad,
          descripcion,
        },
      },

      pagos:
        abono > 0
          ? {
              create: {
                metodo: metodoPago,
                valor: abono,
              },
            }
          : undefined,
    },
  });

  redirect("/empleado");
}

export default function NuevoPedidoPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <section className="ml-72 p-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow">
          <h1 className="text-4xl font-bold text-slate-900">Nuevo pedido</h1>
          <p className="mt-2 text-slate-500">
            Registra cliente, servicio, prenda, valor final y abono.
          </p>

          <form action={crearPedido} className="mt-8 grid gap-8">
            <div className="rounded-3xl border bg-slate-50 p-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Datos del cliente
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">
                    Nombre del cliente
                  </label>
                  <input
                    name="nombreCliente"
                    required
                    className="mt-1 w-full rounded-xl border p-3"
                    placeholder="Ej: María González"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Teléfono</label>
                  <input
                    name="telefono"
                    className="mt-1 w-full rounded-xl border p-3"
                    placeholder="Ej: 3001234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Dirección</label>
                  <input
                    name="direccion"
                    className="mt-1 w-full rounded-xl border p-3"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Datos del servicio
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">Servicio</label>
                  <select
                    name="servicio"
                    required
                    className="mt-1 w-full rounded-xl border p-3"
                  >
                    <option value="">Seleccione servicio</option>
                    <option value="Lavado">Lavado</option>
                    <option value="Planchado">Planchado</option>
                    <option value="Tintura">Tintura</option>
                    <option value="Lavado + Planchado">
                      Lavado + Planchado
                    </option>
                    <option value="Solo secado">Solo secado</option>
                    <option value="Lavado delicado">Lavado delicado</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Tipo de prenda
                  </label>
                  <input
                    name="tipoPrenda"
                    required
                    className="mt-1 w-full rounded-xl border p-3"
                    placeholder="Ej: Camisa, pantalón, vestido"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Cantidad</label>
                  <input
                    name="cantidad"
                    type="number"
                    defaultValue="1"
                    min="1"
                    required
                    className="mt-1 w-full rounded-xl border p-3"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium">
                  Descripción de la prenda
                </label>
                <input
                  name="descripcion"
                  className="mt-1 w-full rounded-xl border p-3"
                  placeholder="Color, material, observaciones visibles"
                />
              </div>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Pago y saldo
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">
                    Valor final
                  </label>
                  <input
                    name="total"
                    type="number"
                    min="0"
                    step="1000"
                    required
                    className="mt-1 w-full rounded-xl border p-3"
                    placeholder="Ej: 25000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Abono inicial
                  </label>
                  <input
                    name="abono"
                    type="number"
                    min="0"
                    step="1000"
                    defaultValue="0"
                    className="mt-1 w-full rounded-xl border p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Método de pago
                  </label>
                  <select
                    name="metodoPago"
                    className="mt-1 w-full rounded-xl border p-3"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium">Observación</label>
                <textarea
                  name="observacion"
                  className="mt-1 w-full rounded-xl border p-3"
                  placeholder="Notas adicionales del pedido"
                />
              </div>
            </div>

            <button className="rounded-2xl bg-teal-500 px-6 py-4 text-lg font-bold text-white shadow hover:bg-teal-600">
              Guardar pedido
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}