import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GERENTE_COOKIE = "lavaseco_auth";
const EMPLEADO_COOKIE = "lavaseco_empleado_auth";

// Mismo AUTH_SECRET que lib/auth.ts, sin valor por defecto (RNF04) -- ver ese
// archivo para la razón y cómo regenerarlo. Este middleware es lo que de
// verdad protege /gerente/*, así que no puede quedarse con un fallback
// adivinable tampoco.
const AUTH_SECRET: string = (() => {
  const valor = process.env.AUTH_SECRET;
  if (!valor) {
    throw new Error(
      "AUTH_SECRET no está definido. Configúralo en .env antes de iniciar la aplicación — no hay valor por defecto por seguridad (RNF04)."
    );
  }
  return valor;
})();

// Solo requieren cookie de gerente
const rutasGerente = [
  "/gerente",
  "/movimientos",
  "/pedidos-antiguos",
  "/inventario",
  "/clientes",
  "/cierres-caja", // ticket con los totales de caja (RNF04)
  "/pedidos/nuevo",
  "/pedidos/[id]",
];

// Rutas exclusivamente de empleado (acepta cookie gerente O empleado)
const rutasEmpleado = [
  "/pedidos/rapido",
  "/inventario-empleado",
  "/entradas-salidas-empleado",
  "/gastos-empleado",
  "/empleado",
  "/recibos",
  "/clientes-empleado",
  "/entrega-empleado",
];

// Rutas accesibles con cualquiera de las dos sesiones
const rutasCompartidas = [
  "/pedidos",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Páginas de login: siempre accesibles
  if (
    pathname === "/login" ||
    pathname === "/empleado-login"
  ) {
    return NextResponse.next();
  }

  const gerenteToken = request.cookies.get(GERENTE_COOKIE)?.value;
  const empleadoToken = request.cookies.get(EMPLEADO_COOKIE)?.value;

  const gerenteOk = gerenteToken === AUTH_SECRET;
  const empleadoOk = empleadoToken === "empleado_activo";

  // API (RNF04): protegida por defecto -- todo lo que cuelgue de /api exige
  // sesión de gerente. Hoy la única ruta es POST /api/pedidos, que solo llama
  // el formulario de /pedidos/nuevo (página de gerente). Una API futura para
  // empleado tendría que permitirse aquí de forma explícita.
  // Responde 401 en JSON y no redirige: un fetch() que sigue un redirect a
  // /login recibiría HTML con 200 y lo trataría como éxito.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    if (!gerenteOk) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Rutas solo gerente
  const esRutaGerente =
    rutasGerente.some((ruta) => pathname === ruta || pathname.startsWith(ruta + "/")) ||
    // /pedidos/nuevo y /pedidos/<número> son de gerente
    (pathname.startsWith("/pedidos/") &&
      !pathname.startsWith("/pedidos/rapido"));

  if (esRutaGerente) {
    if (!gerenteOk) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Rutas solo empleado (o gerente también puede entrar)
  const esRutaEmpleado = rutasEmpleado.some((ruta) =>
    pathname.startsWith(ruta)
  );

  if (esRutaEmpleado) {
    if (!gerenteOk && !empleadoOk) {
      return NextResponse.redirect(new URL("/empleado-login", request.url));
    }
    return NextResponse.next();
  }

  // Rutas compartidas: cualquiera de las dos sesiones
  const esRutaCompartida = rutasCompartidas.some((ruta) =>
    pathname.startsWith(ruta)
  );

  if (esRutaCompartida) {
    if (!gerenteOk && !empleadoOk) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/empleado/:path*",
    "/inventario/:path*",
    "/inventario-empleado/:path*",
    "/entradas-salidas-empleado/:path*",
    "/gastos-empleado/:path*",
    "/pedidos/:path*",
    "/recibos/:path*",
    "/gerente/:path*",
    "/movimientos/:path*",
    "/pedidos-antiguos/:path*",
    "/clientes/:path*",
    "/clientes-empleado/:path*",
    "/entrega-empleado/:path*",
    "/cierres-caja/:path*",
    "/api/:path*",
  ],
};
