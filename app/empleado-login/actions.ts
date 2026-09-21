"use server";

import { redirect } from "next/navigation";
import { crearSesionEmpleado } from "@/lib/empleado-auth";

// Sin credencial a propósito (RNF04): ver la decisión documentada, el riesgo
// aceptado y la recomendación de red en lib/empleado-auth.ts.
export async function empleadoLoginAction() {
  await crearSesionEmpleado();

  redirect("/empleado");
}