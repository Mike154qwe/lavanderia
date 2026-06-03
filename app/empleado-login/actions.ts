"use server";

import { redirect } from "next/navigation";
import { crearSesionEmpleado } from "@/lib/empleado-auth";

export async function empleadoLoginAction() {
  await crearSesionEmpleado();

  redirect("/pedidos/rapido");
}