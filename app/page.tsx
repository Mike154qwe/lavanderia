import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
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
          servicio,
          tipo: tipoPrenda,
          cantidad,
          descripcion,
          valor: total,
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
    <div className="space-y-5 p-6">
      <div className="card mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-black text-gray-900">Nuevo pedido</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registra cliente, servicio, prenda, valor final y abono.
        </p>

        <form action={crearPedido} className="mt-6 grid gap-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-gray-900">Datos del cliente</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Nombre del cliente
                </label>
                <input
                  name="nombreCliente"
                  required
                  className="input-modern"
                  placeholder="Ej: María González"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono</label>
                <input
                  name="telefono"
                  className="input-modern"
                  placeholder="Ej: 3001234567"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Dirección</label>
                <input
                  name="direccion"
                  className="input-modern"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-gray-900">Datos del servicio</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Servicio</label>
                <select name="servicio" required className="input-modern">
                  <option value="">Seleccione servicio</option>
                  <option value="Lavado">Lavado</option>
                  <option value="Planchado">Planchado</option>
                  <option value="Tintura">Tintura</option>
                  <option value="Lavado + Planchado">Lavado + Planchado</option>
                  <option value="Solo secado">Solo secado</option>
                  <option value="Lavado delicado">Lavado delicado</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Tipo de prenda
                </label>
                <input
                  name="tipoPrenda"
                  required
                  className="input-modern"
                  placeholder="Ej: Camisa, pantalón, vestido"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Cantidad</label>
                <input
                  name="cantidad"
                  type="number"
                  defaultValue="1"
                  min="1"
                  required
                  className="input-modern"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Descripción de la prenda
              </label>
              <input
                name="descripcion"
                className="input-modern"
                placeholder="Color, material, observaciones visibles"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-gray-900">Pago y saldo</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Valor final
                </label>
                <input
                  name="total"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  className="input-modern"
                  placeholder="Ej: 25000"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Abono inicial
                </label>
                <input
                  name="abono"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="input-modern"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Método de pago
                </label>
                <select name="metodoPago" className="input-modern">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Observación</label>
              <textarea
                name="observacion"
                className="textarea-modern"
                placeholder="Notas adicionales del pedido"
              />
            </div>
          </div>

          <button className="btn-primary">Guardar pedido</button>
        </form>
      </div>
    </div>
  );
}