import { cookies } from "next/headers";

const COOKIE_NAME = "lavaseco_empleado_auth";

export async function crearSesionEmpleado() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "empleado_activo", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function cerrarSesionEmpleado() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}