import { cookies } from "next/headers";

// RNF04 — decisión documentada, no callada: el acceso de empleado NO pide
// credencial. El «login» (app/empleado-login) es un botón que crea la cookie de
// abajo con un valor fijo y sin firmar; no hay usuario, contraseña ni PIN. Se
// evaluó y se dejó así a propósito para este alcance:
//   - Por qué: el mostrador lo atiende personal con poca práctica en sistemas
//     (incluida una persona mayor), y el botón grande «Toca el botón para
//     entrar» fue una decisión de usabilidad (commit 23c23cb). Pedir una
//     contraseña en cada turno frenaría la atención al cliente.
//   - Qué riesgo se acepta: quien pueda abrir la app puede entrar como empleado,
//     y la cookie se puede fabricar a mano; no hay forma de distinguir a una
//     persona de otra. Esto NO es autenticación: es una puerta de conveniencia.
//   - Cómo se limita el daño desde el código: mínimo privilegio. La sesión de
//     empleado solo abre las pantallas del mostrador (ver proxy.ts y la tabla
//     ACCESO de tests/proxy-rnf04.test.mjs): no llega al listado de /pedidos con
//     los datos de todos los clientes, ni a /clientes, /movimientos,
//     /cierres-caja, /gerente*, /pedidos-antiguos, /inventario ni a /api. Las
//     búsquedas de empleado (clientes, «Llegó a recoger») exigen un término y
//     devuelven pocos resultados.
//   - Lo que el código NO puede garantizar: quién llega a la aplicación. La
//     mitigación que falta es de RED y es una recomendación operativa para el
//     despliegue en el negocio real, no algo que este archivo pueda imponer: que
//     la app solo sea alcanzable desde el equipo del mostrador (por ejemplo
//     arrancándola con `next start -H 127.0.0.1`, o con una regla del firewall
//     que limite el puerto), y no desde la Wi-Fi de clientes o visitas ni desde
//     internet. Sin esa restricción, `next start` escucha en todas las
//     interfaces del equipo.
//   - Exposición residual conocida (pendiente de decidir con el negocio): «Lo de
//     hoy» (/entradas-salidas-empleado) deja navegar cualquier fecha del año y
//     buscar por cliente o teléfono, con montos; /recibos/[id]/pdf abre
//     cualquier recibo por su número; /entrega-empleado consulta cualquier
//     pedido por número y no valida el saldo pendiente al entregar.
//   - Si el despliegue cambia (la app se hace accesible fuera del negocio, p. ej.
//     para abrir el panel remoto desde el celular; equipo compartido; Wi-Fi
//     abierta), esta decisión debe reevaluarse: al menos un PIN de empleado y la
//     cookie firmada con AUTH_SECRET, como la del gerente (lib/auth.ts). No es
//     una garantía permanente: es una decisión de alcance para esta versión.
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