// RNF04 · el proxy (middleware de autenticación) debe cubrir TAMBIÉN las rutas de API.
//
// El matcher de proxy.ts es una lista de rutas protegidas: lo que no está en la lista
// queda sin autenticación. /api/pedidos (POST que crea pedidos) no estaba, así que
// cualquiera podía crear pedidos sin sesión. Estas pruebas usan el matcher y la función
// REAL de proxy.ts (no una copia): primero preguntan a Next si el proxy se ejecutaría
// para esa URL y, si es así, evalúan la decisión del proxy con distintas cookies.
//
// Uso:  npm run test:rnf04
import { test } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";

process.env.AUTH_SECRET = "secreto-de-prueba-rnf04";
register("./helpers/next-server-loader.mjs", import.meta.url);

const require = createRequire(import.meta.url);
const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");
const { NextRequest } = await import("./helpers/next-server-shim.mjs");
const { proxy, config } = await import("../proxy.ts");

const GERENTE = `lavaseco_auth=${process.env.AUTH_SECRET}`;
const EMPLEADO = "lavaseco_empleado_auth=empleado_activo";
const GERENTE_FALSA = "lavaseco_auth=cookie-falsa";

/** "sin-proxy" | "pasa" | "redirect:<ruta>" | "<status>" */
function decidir(pathname, cookie = "") {
  const url = `http://localhost:3000${pathname}`;
  if (!unstable_doesMiddlewareMatch({ config, url })) return "sin-proxy";
  const res = proxy(new NextRequest(url, { headers: cookie ? { cookie } : {} }));
  if (res.headers.get("x-middleware-next") === "1") return "pasa";
  if (res.status === 307 || res.status === 308) {
    return `redirect:${new URL(res.headers.get("location")).pathname}`;
  }
  return String(res.status);
}

// ── /api/* ────────────────────────────────────────────────────────────────────
const RUTAS_API = ["/api/pedidos", "/api", "/api/otra/ruta/futura"];

for (const ruta of RUTAS_API) {
  test(`${ruta}: sin sesión responde 401 (no queda abierta ni redirige a una página)`, () => {
    assert.equal(decidir(ruta), "401", `sin cookies: ${decidir(ruta)}`);
  });
}

test("/api/pedidos: la sesión de empleado NO basta (la llama solo el formulario de gerente)", () => {
  assert.equal(decidir("/api/pedidos", EMPLEADO), "401");
});

test("/api/pedidos: una cookie de gerente falsa NO basta", () => {
  assert.equal(decidir("/api/pedidos", GERENTE_FALSA), "401");
});

test("/api/pedidos: con sesión de gerente pasa (llamada legítima de /pedidos/nuevo)", () => {
  assert.equal(decidir("/api/pedidos", GERENTE), "pasa");
});

// ── Regresión: las rutas de página se comportan igual que antes ───────────────
const REGRESION = [
  ["/gerente", "", "redirect:/login"],
  ["/gerente", EMPLEADO, "redirect:/login"],
  ["/gerente", GERENTE, "pasa"],
  ["/pedidos/nuevo", EMPLEADO, "redirect:/login"],
  ["/pedidos/nuevo", GERENTE, "pasa"],
  ["/pedidos/rapido", "", "redirect:/empleado-login"],
  ["/pedidos/rapido", EMPLEADO, "pasa"],
  ["/pedidos/rapido", GERENTE, "pasa"],
  ["/pedidos", EMPLEADO, "pasa"],
  ["/recibos/1/pdf", EMPLEADO, "pasa"],
  ["/recibos/1/pdf", "", "redirect:/empleado-login"],
  ["/gastos-empleado", EMPLEADO, "pasa"],
  ["/empleado", "", "redirect:/empleado-login"],
  ["/login", "", "sin-proxy"],
  ["/empleado-login", "", "sin-proxy"],
];

for (const [ruta, cookie, esperado] of REGRESION) {
  const quien = cookie === GERENTE ? "gerente" : cookie === EMPLEADO ? "empleado" : "sin sesión";
  test(`regresión: ${ruta} (${quien}) → ${esperado}`, () => {
    assert.equal(decidir(ruta, cookie), esperado);
  });
}
