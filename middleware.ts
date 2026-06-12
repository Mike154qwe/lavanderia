import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GERENTE_COOKIE = "lavaseco_auth";
const EMPLEADO_COOKIE = "lavaseco_empleado_auth";

// Solo requieren cookie de gerente
const rutasGerente = [
  "/gerente",
  "/movimientos",
  "/pedidos-antiguos",
  "/inventario",
  "/clientes",
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Páginas de login: siempre accesibles
  if (
    pathname === "/login" ||
    pathname === "/empleado-login"
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || "secret";
  const gerenteToken = request.cookies.get(GERENTE_COOKIE)?.value;
  const empleadoToken = request.cookies.get(EMPLEADO_COOKIE)?.value;

  const gerenteOk = gerenteToken === secret;
  const empleadoOk = empleadoToken === "empleado_activo";

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
  ],
};
