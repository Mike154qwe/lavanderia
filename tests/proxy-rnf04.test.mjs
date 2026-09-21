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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  ["/pedidos", EMPLEADO, "redirect:/login"], // listado con datos de clientes: solo gerente
  ["/pedidos", GERENTE, "pasa"],
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

// ── Ticket de cierre de caja: datos financieros, solo gerente ─────────────────
// /cierres-caja/[id]/ticket recalcula y muestra los totales de caja del día.
// Tampoco estaba en el matcher: cualquiera podía abrirlo probando ids 1, 2, 3…
const TICKET = "/cierres-caja/1/ticket";

test(`${TICKET}: sin sesión redirige a /login`, () => {
  assert.equal(decidir(TICKET), "redirect:/login");
});

test(`${TICKET}: la sesión de empleado NO basta (es información de gerente)`, () => {
  assert.equal(decidir(TICKET, EMPLEADO), "redirect:/login");
});

test(`${TICKET}: una cookie de gerente falsa NO basta`, () => {
  assert.equal(decidir(TICKET, GERENTE_FALSA), "redirect:/login");
});

test(`${TICKET}: con sesión de gerente pasa (el redirect tras «Hacer cierre»)`, () => {
  assert.equal(decidir(TICKET, GERENTE), "pasa");
});

// ── Nivel de acceso de CADA ruta de la app (mínimo privilegio) ────────────────
// «publica»   : login/logout y la raíz.
// «gerente»   : solo sesión de gerente. Incluye todo lo que muestra datos de clientes
//               en bloque, dinero o historial (/pedidos, /clientes, /movimientos,
//               /cierres-caja, /gerente*, /pedidos-antiguos, /inventario) y /api.
// «mostrador» : lo que Esperanza y Diego necesitan en el día a día (empleado o gerente).
// Una ruta nueva DEBE declararse aquí: la prueba de completitud falla si no está.
const ACCESO = {
  "/": "publica",
  "/login": "publica",
  "/empleado-login": "publica",
  "/logout": "publica",
  "/empleado-logout": "publica",

  "/api/pedidos": "gerente",
  "/cierres-caja/1/ticket": "gerente",
  "/clientes": "gerente",
  "/clientes/nuevo": "gerente",
  "/gerente": "gerente",
  "/gerente/dia/1": "gerente",
  "/gerente/remoto": "gerente",
  "/inventario": "gerente",
  "/movimientos": "gerente",
  "/movimientos/dia/1": "gerente",
  "/pedidos": "gerente",
  "/pedidos-antiguos": "gerente",
  "/pedidos/1": "gerente",
  "/pedidos/nuevo": "gerente",

  "/empleado": "mostrador",
  "/pedidos/rapido": "mostrador",
  "/clientes-empleado": "mostrador",
  "/inventario-empleado": "mostrador",
  "/entradas-salidas-empleado": "mostrador",
  "/gastos-empleado": "mostrador",
  "/entrega-empleado": "mostrador",
  "/recibos/1/pdf": "mostrador",
};

const EMPLEADO_FALSA = "lavaseco_empleado_auth=otro-valor";
const rutasDe = (nivel) => Object.keys(ACCESO).filter((r) => ACCESO[r] === nivel);
const PUBLICAS = new Set(rutasDe("publica"));
const RAIZ_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");

function rutasDeLaApp(dir = RAIZ_APP, segmentos = []) {
  const rutas = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      rutas.push(...rutasDeLaApp(path.join(dir, e.name), [...segmentos, e.name]));
    } else if (/^(page|route)\.(tsx|ts)$/.test(e.name)) {
      const partes = segmentos
        .filter((s) => !/^\(.*\)$/.test(s)) // grupos de rutas: no forman parte de la URL
        .map((s) => s.replace(/\[[^\]]+\]/g, "1")); // [id] -> 1
      rutas.push("/" + partes.join("/"));
    }
  }
  return rutas;
}

/** Lo que debe pasar cuando NO hay permiso: 401 para la API, redirect al login para páginas. */
const denegado = (ruta) => (ruta.startsWith("/api") ? "401" : "redirect:/login");

test("cada ruta de la app tiene un nivel de acceso declarado (y la tabla no tiene rutas fantasma)", () => {
  const reales = rutasDeLaApp();
  assert.ok(reales.length > 15, `se esperaban muchas rutas, se encontraron ${reales.length}`);

  const sinDeclarar = reales.filter((r) => !(r in ACCESO));
  const fantasma = Object.keys(ACCESO).filter((r) => r !== "/" && !reales.includes(r));
  assert.deepEqual(sinDeclarar, [], `Rutas sin nivel de acceso declarado (decide si son gerente o mostrador): ${sinDeclarar.join(", ")}`);
  assert.deepEqual(fantasma, [], `Rutas declaradas que ya no existen: ${fantasma.join(", ")}`);
});

test("sin sesión: ninguna ruta no pública queda abierta", () => {
  const abiertas = rutasDeLaApp().filter((r) => !PUBLICAS.has(r) && ["pasa", "sin-proxy"].includes(decidir(r)));
  assert.deepEqual(abiertas, [], `Rutas accesibles SIN sesión: ${abiertas.join(", ")}`);
});

test("con sesión de EMPLEADO: nada exclusivo de gerente es accesible", () => {
  const accesibles = rutasDe("gerente").filter((r) => decidir(r, EMPLEADO) !== denegado(r));
  assert.deepEqual(
    accesibles,
    [],
    `Rutas de gerente que la sesión de empleado SÍ alcanza: ${accesibles.map((r) => `${r} (${decidir(r, EMPLEADO)})`).join(", ")}`,
  );
});

test("con cookies falsas o inválidas: ni el mostrador ni lo de gerente se abren", () => {
  for (const cookie of [GERENTE_FALSA, EMPLEADO_FALSA]) {
    const abiertas = [...rutasDe("gerente"), ...rutasDe("mostrador")].filter((r) =>
      ["pasa", "sin-proxy"].includes(decidir(r, cookie)),
    );
    assert.deepEqual(abiertas, [], `Con «${cookie}» se abren: ${abiertas.join(", ")}`);
  }
});

test("con sesión de EMPLEADO: todo el mostrador sigue funcionando (no se recortó de más)", () => {
  const bloqueadas = rutasDe("mostrador").filter((r) => decidir(r, EMPLEADO) !== "pasa");
  assert.deepEqual(bloqueadas, [], `Rutas del mostrador que el empleado NO alcanza: ${bloqueadas.join(", ")}`);
});

test("con sesión de GERENTE: conserva acceso a todo, incluido el mostrador", () => {
  const bloqueadas = [...rutasDe("gerente"), ...rutasDe("mostrador")].filter((r) => decidir(r, GERENTE) !== "pasa");
  assert.deepEqual(bloqueadas, [], `Rutas que el gerente NO alcanza: ${bloqueadas.join(", ")}`);
});
