import { cerrarSesionEmpleado } from "@/lib/empleado-auth";
import { redirect } from "next/navigation";

export async function GET() {
  await cerrarSesionEmpleado();
  redirect("/empleado-login");
}