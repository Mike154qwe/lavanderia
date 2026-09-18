import { cookies } from "next/headers";

const COOKIE_NAME = "lavaseco_auth";

// Sin valor por defecto a propósito (RNF04): un fallback como "secret" es un
// secreto adivinable, y aceptar sesiones firmadas con él es peor que no
// arrancar. Si AUTH_SECRET falta, la app debe fallar aquí, al cargar este
// módulo, no dejar pasar sesiones inseguras en silencio.
//
// Para (re)generar un valor: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const AUTH_SECRET: string = (() => {
  const valor = process.env.AUTH_SECRET;
  if (!valor) {
    throw new Error(
      "AUTH_SECRET no está definido. Configúralo en .env antes de iniciar la aplicación — no hay valor por defecto por seguridad (RNF04)."
    );
  }
  return valor;
})();

export async function crearSesion() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, AUTH_SECRET, {
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

  return token === AUTH_SECRET;
}