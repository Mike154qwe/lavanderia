# Panel remoto -- La Manuelita

Sitio estático (Firebase Hosting) con el dashboard de solo lectura que la
gerente abre desde su celular, fuera del negocio: KPIs acumulados, tendencia
de ganancia neta y efectivo en caja por día, e historial de días con cierre
(clic en un día para ver su detalle -- entradas, salidas, desglose del
cierre). Es un proyecto **separado** de `lavanderia-local` (la app del
mostrador, Next.js + PM2, servidor en ejecución): este sitio no tiene
servidor propio, corre 100% en el navegador y se despliega a Firebase
Hosting con `next build` (`output: "export"`).

**Estrictamente de solo lectura.** No existe ninguna función de escritura a
Firestore en este proyecto (ni `setDoc`, ni `addDoc`, nada) -- a propósito,
para que sea imposible escribir por error, no solo que la interfaz no
tenga botones. `lib/panel-remoto.ts` aquí es una copia reducida, de solo
lectura, de la de `lavanderia-local`.

Ambos proyectos comparten el mismo proyecto de Firebase
(`lavaseco-la-manuelita`) y la misma colección de Firestore (`panelRemoto`,
que escribe `hacerCierreCaja` en `lavanderia-local/app/gerente/page.tsx`),
pero no comparten código ni ciclo de despliegue.

## Por qué es un proyecto aparte y no una rama

Una rama tiene sentido cuando el código eventualmente se fusiona de vuelta
al mismo artefacto desplegable. Aquí nunca pasa eso: `lavanderia-local` se
despliega a PM2 (servidor Node corriendo); este sitio se despliega a
Firebase Hosting (archivos estáticos, sin servidor). Son dos ciclos de vida
de despliegue totalmente distintos.

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

```bash
npm install
npm run dev          # http://localhost:3002 (puerto distinto al de lavanderia-local)
```

## Build y despliegue

```bash
npm run build         # genera out/ (exportación estática)
firebase deploy --only hosting   # publica a https://lavaseco-la-manuelita.web.app
```

**No desplegado públicamente todavía** (al momento de crear este archivo):
verificado en local contra Firebase Auth/Firestore reales antes de publicar
a la URL pública.
