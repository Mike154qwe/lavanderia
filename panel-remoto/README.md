# Panel remoto -- La Manuelita

Sitio estático (Firebase Hosting) con el dashboard de solo lectura que la
gerente abre desde su celular, fuera del negocio: KPIs acumulados, tendencia
de ganancia neta y efectivo en caja por día, e historial de días con cierre
(clic en un día para ver su detalle -- entradas, salidas, desglose del
cierre). Vive en `lavanderia-local/panel-remoto/` -- una carpeta del mismo
repositorio (importada con `git subtree`, historial preservado desde su
antiguo repo `panel-remoto-web`, 22-sep-2026), pero es un proyecto Next.js
**independiente** de la app del mostrador: su propio `package.json`, su
propio `tsconfig.json` (con su propio alias `@/*`, que resuelve a esta
carpeta), su propio `node_modules/` y su propio ciclo de despliegue. No
tiene servidor propio -- corre 100% en el navegador y se despliega a
Firebase Hosting con `next build` (`output: "export"`), aparte de
`lavanderia-local`, que se despliega a PM2 (servidor Node en ejecución).

El `tsconfig.json` de `lavanderia-local` excluye explícitamente esta carpeta
(`"exclude": [..., "panel-remoto"]`) -- sin eso, su `include` sin acotar
(`**/*.ts`) intentaría tipar este proyecto con el alias `@/*` de
`lavanderia-local`, que resuelve a rutas equivocadas.

**Estrictamente de solo lectura.** No existe ninguna función de escritura a
Firestore en este proyecto (ni `setDoc`, ni `addDoc`, nada) -- a propósito,
para que sea imposible escribir por error, no solo que la interfaz no
tenga botones. `lib/panel-remoto.ts` aquí es una copia reducida, de solo
lectura, de la de `lavanderia-local`.

Ambos proyectos comparten el mismo proyecto de Firebase
(`lavaseco-la-manuelita`) y la misma colección de Firestore (`panelRemoto`,
que escribe `hacerCierreCaja` en `lavanderia-local/app/gerente/page.tsx`),
pero no comparten código ni ciclo de despliegue.

## Por qué vive en el monorepo pero no se mezcla con la app del mostrador

Nunca tuvo sentido como rama de `lavanderia-local`: una rama es para código
que eventualmente se fusiona de vuelta al mismo artefacto desplegable, y
esto nunca se fusiona con nada -- `lavanderia-local` se despliega a PM2
(servidor Node corriendo); esto se despliega a Firebase Hosting (archivos
estáticos, sin servidor). Empezó como repositorio propio, hermano de
`lavanderia-local` (`panel-remoto-web/`), y se unificó a este repo con
`git subtree` (22-sep-2026) para tener todo el código del trabajo de grado
en un solo lugar sin perder el historial -- pero sigue siendo, en la
práctica, un proyecto Next.js aparte: su propio `package.json`, su propio
`tsconfig.json`, su propio ciclo de instalar/compilar/desplegar. La única
diferencia real de estar dentro del monorepo es que su `tsconfig.json`
raíz debe excluirse del de `lavanderia-local` (ver arriba).

## Autenticación

Protegido con **Firebase Auth** (correo + contraseña) -- `components/
AuthGate.tsx`. A propósito NO reutiliza la cookie simple del sistema local
(`empleado_activo`, ver `lavanderia-local/lib/empleado-auth.ts`): ese
mecanismo asume que ya hay control de acceso físico al mostrador y que el
navegador está en la misma red que el servidor. Este sitio queda expuesto a
internet entero, así que necesita autenticación real.

**Cuenta actual: `lvmanuelita@gmail.com`.** Es la cuenta del **prototipo
académico**, creada para las pruebas de este trabajo de grado -- no es
necesariamente la cuenta final que usaría la gerente en una operación real
del negocio. Si el sistema se llegara a desplegar de verdad, queda como
trabajo futuro decidir la cuenta definitiva (correo real de la gerente,
posiblemente con verificación en dos pasos) y rotar o revocar esta.

## Reglas de Firestore

`panelRemoto` pasa de completamente cerrado (`allow read, write: if false`,
cierre de emergencia de RNF04 documentado en `lavanderia-local/lib/
empleado-auth.ts`) a **lectura permitida solo para usuarios autenticados**
con Firebase Auth. Todo lo demás -- incluida `respaldosDb`, que tiene la
base completa comprimida -- sigue cerrado del todo. El archivo de reglas
vive en `lavanderia-local/firestore.rules` (un solo juego de reglas por
proyecto de Firebase, gobierna ambos sitios).

## Historial y backfill (22-sep-2026)

`panelRemoto` solo se escribía en vivo desde `hacerCierreCaja` -- los cierres
de mayo-junio (anteriores a esa sincronización) nunca llegaron a Firestore.
`lavanderia-local/scripts/backfill-panel-remoto.ts` llenó esos días una vez
(no sobrescribe días que ya existan). Importante: `panelRemoto` es **un
documento por día**, no por cierre -- un día con varios cierres solo guarda
los números del **último** cierre de ese día, más las entradas/salidas del
día completo.

**Aviso pendiente:** el backfill escribe dos campos nuevos por día,
`gastosEfectivo` y `efectivoEnCaja` (`CierreRemoto` en `lib/panel-remoto.ts`,
opcionales), necesarios para la tendencia de "efectivo en caja". `
hacerCierreCaja` (en `lavanderia-local`, sin tocar en esta tarea) **todavía
no escribe esos dos campos** -- un cierre nuevo en vivo, el día que la
escritura a Firestore deje de estar bloqueada por las reglas, va a producir
un documento sin `efectivoEnCaja`. El dashboard ya maneja ese caso
(`efectivoEnCaja !== undefined`), pero la tendencia de ese día quedaría
incompleta hasta que se decida extender `hacerCierreCaja` para incluirlos.

## Desarrollo local

Todos los comandos corren **desde esta carpeta** (`lavanderia-local/panel-remoto/`),
no desde la raíz del repo -- tiene su propio `package.json`/`node_modules`,
separado del de `lavanderia-local`.

```bash
cd lavanderia-local/panel-remoto
npm install
npm run dev          # http://localhost:3002 (puerto distinto al de lavanderia-local)
```

`.env.local` (config web de Firebase, no secreta) no viaja con `git subtree`
-- si es una copia nueva del repo, hay que recrearlo a mano (ver
`lib/firebase.ts` para las variables que necesita).

## Build y despliegue

```bash
cd lavanderia-local/panel-remoto
npm run build         # genera out/ (exportación estática)
firebase deploy --only hosting   # publica a https://lavaseco-la-manuelita.web.app
```

`firebase.json`/`.firebaserc` son relativos a esta carpeta -- el comando de
despliegue no cambió, solo desde dónde se ejecuta.

**No desplegado públicamente todavía.**
