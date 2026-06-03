import { cookies } from "next/headers";

const COOKIE_NAME = "lavaseco_auth";

export async function crearSesion() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, process.env.AUTH_SECRET || "secret", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function estaAutenticado() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  return token === (process.env.AUTH_SECRET || "secret");
}