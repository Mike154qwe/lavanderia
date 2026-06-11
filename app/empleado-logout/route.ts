import { cerrarSesionEmpleado } from "@/lib/empleado-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await cerrarSesionEmpleado();
  return NextResponse.redirect(new URL("/empleado-login", request.url));
}
