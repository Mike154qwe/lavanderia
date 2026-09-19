import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import { estaEmpleadoAutenticado } from "@/lib/empleado-auth";

// La raíz no es una pantalla: cada quien entra por su oficio.
// El alta de pedidos vive solo en /pedidos/rapido (mostrador).
export default async function HomePage() {
  if (await estaEmpleadoAutenticado()) redirect("/empleado");
  if (await estaAutenticado()) redirect("/gerente");
  redirect("/empleado-login");
}
