import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function crearCliente(formData: FormData) {
  "use server";

  await prisma.cliente.create({
    data: {
      nombre: String(formData.get("nombre")),
      telefono: String(formData.get("telefono") || ""),
      direccion: String(formData.get("direccion") || ""),
    },
  });

  redirect("/clientes?flash=Cliente+creado");
}

export default function NuevoClientePage() {
  return (
    <main className="min-h-screen p-8">
      <section className="mx-auto max-w-xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Nuevo cliente</h1>

        <form action={crearCliente} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input name="nombre" required className="mt-1 w-full rounded-lg border p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium">Teléfono</label>
            <input name="telefono" className="mt-1 w-full rounded-lg border p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium">Dirección</label>
            <input name="direccion" className="mt-1 w-full rounded-lg border p-2" />
          </div>

          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            Guardar
          </button>
        </form>
      </section>
    </main>
  );
}
