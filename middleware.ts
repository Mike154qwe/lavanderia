import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GERENTE_COOKIE = "lavaseco_auth";
const EMPLEADO_COOKIE = "lavaseco_empleado_auth";

const rutasGerente = [
  "/gerente",
  "/movimientos",
  "/pedidos-antiguos",
];

const rutasEmpleado = [
  "/empleado",
  "/inventario",
  "/pedidos",
  "/recibos",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const esRutaGerente = rutasGerente.some((ruta) =>
    pathname.startsWith(ruta)
  );

  const esRutaEmpleado = rutasEmpleado.some((ruta) =>
    pathname.startsWith(ruta)
  );

  if (pathname === "/login" || pathname === "/empleado-login") {
    return NextResponse.next();
  }

  if (esRutaGerente) {
    const token = request.cookies.get(GERENTE_COOKIE)?.value;
    const secret = process.env.AUTH_SECRET || "secret";

    if (token !== secret) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (esRutaEmpleado) {
    const gerenteToken = request.cookies.get(GERENTE_COOKIE)?.value;
    const empleadoToken = request.cookies.get(EMPLEADO_COOKIE)?.value;
    const secret = process.env.AUTH_SECRET || "secret";

    const gerenteOk = gerenteToken === secret;
    const empleadoOk = empleadoToken === "empleado_activo";

    if (!gerenteOk && !empleadoOk) {
      return NextResponse.redirect(new URL("/empleado-login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/empleado/:path*",
    "/inventario/:path*",
    "/pedidos/:path*",
    "/recibos/:path*",
    "/gerente/:path*",
    "/movimientos/:path*",
    "/pedidos-antiguos/:path*",
  ],
};