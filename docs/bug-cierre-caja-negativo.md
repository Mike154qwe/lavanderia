# Cierre de caja: «caja negativa» — diagnóstico y resolución

> **ARCHIVADO — diagnóstico histórico (24-sep-2026).** Este documento describe la
> investigación y la decisión de negocio del 21-sep-2026 que llevó al modelo de dos números
> (`lib/caja.ts`); el bug que describe **ya está resuelto y en `main`** desde entonces, no es
> un problema abierto. Se conserva tal cual se escribió, como registro de la investigación,
> **no** como descripción del estado actual del sistema. Dos cosas cambiaron después de
> escrito y ya no son ciertas hoy, aunque el texto de abajo las siga mencionando:
> - **`/gerente/dia/[fecha]`** (mencionada varias veces abajo, incluida toda la sección
>   "Gastos registrados por el gerente") **se borró el 23-sep-2026** por quedar sin ningún
>   enlace en la navegación (limpieza de código muerto, commit `38b1c18`). El registro de
>   gastos del gerente sigue existiendo, ahora solo por `/gastos-empleado` (accesible también
>   con sesión de gerente); el detalle financiero de un día específico se ve hoy en
>   `/gerente?fecha=AAAA-MM-DD`.
> - **`/gerente/remoto`** (mencionada en el punto 6 de "Lo que no resuelve") **también se
>   borró el 23-sep-2026** — nunca tuvo login propio y quedó rota sin arreglo simple cuando
>   `firestore.rules` empezó a exigir autenticación. El panel remoto real de la gerente vive
>   en `panel-remoto/` (proyecto aparte, Firebase Hosting, con Firebase Auth), y ya muestra
>   "Ganancia neta" y "Efectivo en caja" como números separados, no "Total caja".
>
> El resto del documento (la fórmula, la decisión de los dos números, los cuatro escenarios,
> `lib/caja.ts` como única fuente de verdad) sigue vigente y es la explicación de por qué el
> sistema calcula la caja como lo hace hoy.

**Estado:** resuelto en código por la **separación de métricas** decidida con el negocio el
21-sep-2026, fusionado a `main` ese mismo rango de días y en producción desde entonces.
**Pruebas:** `npm run test:caja` (38 al 24-sep-2026; el número cambia con el tiempo, ver el
conteo real corriendo el comando) y `npm run test:rnf04` (32).

## Qué pasaba

La app mostraba una sola cifra («Caja esperada» / «Total caja») calculada como todos los
pagos menos todos los gastos, sin mirar el medio de pago. Esa cifra respondía a dos
preguntas distintas a la vez: *¿cuánto se ganó?* y *¿cuánto efectivo hay en el cajón?*.
Un gasto pagado por Nequi restaba de la «caja» aunque no hubiera salido un peso del cajón,
y `GastoCaja.metodo` existía pero no se usaba en ningún cálculo.

## Decisión del negocio: dos números, con nombres claros

| Número | Fórmula | Para qué |
|---|---|---|
| **Ganancia neta** (del día o del cierre) | todo lo recibido − todos los gastos, en cualquier medio | Saber cuánto se ganó. La fórmula histórica **no cambia**; puede ser negativa de forma legítima (p. ej. un día con una nómina grande) |
| **Efectivo en caja** | efectivo recibido − **solo** los gastos con `metodo = "Efectivo"` | Cuadrar el cajón. Ignora Nequi, Daviplata, transferencia y tarjeta, en ingresos y en gastos |

Ya no existe «Caja esperada» ni «Total caja» en la interfaz ni en el ticket.

## Dónde vive (una sola lógica)

`lib/caja.ts` (`calcularCaja`, `ventanaDeCierre`, `enVentana`). Lo usan las cuatro vistas:
la acción de cierre y los KPI de `app/gerente/page.tsx`, `app/gerente/dia/[fecha]/page.tsx` y
el ticket `app/cierres-caja/[id]/ticket/route.ts`. Una prueba estática falla si una vista
vuelve a calcular la caja por su cuenta o si reaparece «Caja esperada».

`CierreCaja.totalCaja` (nombre histórico de la columna, sin migración) guarda la **ganancia
neta**. El «efectivo en caja» no se guarda: se recalcula desde los movimientos, igual que
en el ticket.

## Resultado de los 4 escenarios

| Escenario | Ganancia neta | Efectivo en caja | Veredicto |
|---|---|---|---|
| Control (todo en efectivo) | $70.000 | $70.000 | Coinciden, como debe ser |
| Nómina $400.000 por Nequi | **−$182.500** | **+$130.500** | **No es un bug.** Se ganó $217.500 y la nómina costó $400.000 (217.500 − 400.000 = −182.500): coherente. El cajón no perdió nada: +$130.500 |
| Repro de Joel | −$50.000 | **−$150.000** | **Resuelto.** El efectivo en caja da −$150.000, exactamente lo que Joel esperaba; el neto −$50.000 es coherente (entraron 100.000 y salieron 150.000) |
| Réplica del cierre #14 | $36.420 | $38.580 | **Resuelto.** No hay bug: son dos números distintos. La diferencia de $2.160 es exactamente el neto digital: 18.000 (gasto por transferencia) − 15.840 (ingreso por transferencia) |

Los cuatro escenarios quedaron resueltos por la separación de métricas; ninguno reveló un
bug de cálculo independiente. Sí quedan los pendientes de la sección siguiente.

### Los mismos escenarios con gastos registrados por el empleado

Se repitieron los cuatro escenarios con los gastos cargados **por el formulario real del
empleado** (Playwright, base temporal) y por medios distintos de efectivo. El valor elegido
llega a `GastoCaja.metodo` (Efectivo, Nequi, Daviplata, Transferencia y Tarjeta comprobados uno
por uno) y el ticket da:

| Escenario (gasto del empleado) | Ganancia neta | Efectivo en caja | Si el medio se guardara siempre como «Efectivo» |
|---|---|---|---|
| Control (sin tocar el selector → Efectivo) | $70.000 | $70.000 | igual |
| Nómina $400.000 por **Nequi** | −$182.500 | **$130.500** | −$269.500 (error) |
| Gasto $150.000 por **Tarjeta**, con ingreso $100.000 por Nequi (variante del caso de Joel) | −$50.000 | **$0** | −$150.000 (error) |
| #14: $18.000 por **Transferencia** + $45.000 en efectivo | $36.420 | **$38.580** | $20.580 (error) |

Las pruebas automáticas cubren lo mismo con `responsable = «Empleado»` (escenarios 10–13 de
`tests/cierre-caja.test.mjs`), el contraste en `tests/caja-calculo.test.mjs` y una prueba
estática que exige que el selector salga de `METODOS_PAGO` con «Efectivo» por defecto.

### Gastos registrados por el gerente (`/gerente/dia/[fecha]`)

Mismo tipo de prueba con el formulario real del gerente y gastos por **Tarjeta** (cada uno
llegó a `GastoCaja.metodo`; el día, el ticket y la tarjeta de `/gerente` coinciden):

| Escenario (gasto del gerente) | Ganancia neta | Efectivo en caja | Si se tomara como «Efectivo» |
|---|---|---|---|
| Control (selector sin tocar → Efectivo) | $70.000 | $70.000 | igual |
| Nómina $400.000 por **Tarjeta** | −$182.500 | **$130.500** | −$269.500 (error) |
| $150.000 por **Tarjeta**, ingreso $100.000 por Nequi | −$50.000 | **$0** | −$150.000 (error) |
| #14: $18.000 por **Tarjeta** + $45.000 en efectivo | $36.420 | **$38.580** | $20.580 (error) |

Las pruebas automáticas lo cubren en los escenarios 20–23 de `tests/cierre-caja.test.mjs`, y
una prueba estática exige el mismo selector (desde `METODOS_PAGO`, «Efectivo» por defecto) en
los dos formularios.

## Lo que no resuelve la separación (pendiente)

1. **El efectivo en caja es un movimiento, no un saldo.** El modelo no guarda un fondo
   inicial de caja; el cajón real es el fondo con el que se empezó más este número. Un
   «efectivo en caja» negativo (Joel: −$150.000) significa que el cajón pagó en efectivo más
   de lo que recibió en esa ventana. Guardar el fondo inicial exigiría un campo nuevo y una
   migración, que requieren aprobación aparte.
2. ~~Los gastos del empleado siempre quedan como «Efectivo».~~ **Corregido: esa afirmación era
   errónea.** El formulario `/gastos-empleado` ya tenía el selector `metodo` y el servidor guarda
   lo elegido; los datos reales lo confirman (gastos del empleado por Daviplata, Nequi,
   Transferencia y Efectivo). Lo que sí faltaba era la opción **«Tarjeta»**, que el resto del
   sistema ofrece. Ahora las opciones salen de `METODOS_PAGO` (`lib/types.ts`), con «Efectivo»
   preseleccionado, y la etiqueta dice «Medio de pago». Un gasto de empleado por un medio
   distinto de efectivo **no** se descuenta del efectivo en caja (ver la prueba de contraste
   abajo). El formulario de gastos del gerente (`/gerente/dia/[fecha]`) tampoco ofrecía
   «Tarjeta» y se corrigió igual (selector desde `METODOS_PAGO`, «Efectivo» por defecto).
3. **Sello fijo de las 12:00 en los gastos de `/gerente/dia/[fecha]`.** Esa pantalla guarda
   `createdAt = fecha + "T12:00:00"` sin importar cuándo se registra el gasto. Un gasto
   registrado por la tarde, después de un cierre a las 17:25, queda fechado a las 12:00,
   fuera de la ventana de cualquier cierre posterior, aunque sí cuenta en los KPI del día.
   **No es la causa de ninguna diferencia de los cuatro escenarios** (en los datos reales
   hay 2 gastos con ese sello: uno en un día sin cierres y el de $18.000 del 12-jun, que sí
   cae dentro de la ventana del cierre #14). No se corrigió; sigue siendo un riesgo latente.
4. **Dos cierres reales no coinciden con lo guardado.** Recalculadas sobre sus movimientos
   actuales, la ganancia neta del #8 es $40.500 (guardado $30.000) y la del #12 es −$355.000
   (guardado $45.000): hay pagos y un gasto fechados dentro de esas ventanas que no existían
   al cerrar. Ya pasaba con el ticket; ahora también lo muestran las tarjetas de `/gerente`
   (los otros 12 cierres coinciden exactamente). La base no se modificó.
5. ~~`money()` imprimía los negativos como `$-182.500`.~~ **Resuelto:** ahora `-$182.500`
   (`lib/format.ts`). `/gerente/dia/[fecha]` formateaba a mano y ahora usa `money()`.
6. ~~**El panel remoto** (`/gerente/remoto`, hoy sin datos por Firestore cerrado) sigue
   diciendo «Total caja» y recibe la ganancia neta. No se tocó.~~ **Superado:**
   `/gerente/remoto` se borró el 23-sep-2026 (ver la nota de archivo al inicio). El panel
   remoto real, en `panel-remoto/`, ya recibe y muestra "Ganancia neta" y "Efectivo en caja"
   como números separados (migración de la escritura al Admin SDK, 23-sep-2026).

## Cambio de comportamiento a tener en cuenta

`/gerente/dia/[fecha]` calculaba «Recibido» sumando **todos** los pagos de los pedidos
creados (o con movimiento de historial) ese día, aunque se hubieran pagado otro día, y el
valor cambiaba con el buscador. Ahora usa los pagos del día por su fecha, igual que
`/gerente` y el cierre. Con los datos reales solo cambia el 11-jun: $373.500 → $217.500.

## Cómo ejecutar

```bash
npm run test:caja                      # unitarias, ticket real y estáticas (38 al 24-sep-2026)
KEEP_QA_DB=1 npm run test:caja         # conserva la BD temporal (responsable «Prueba QA - bug caja»)
DATABASE_URL=file:<ruta> npx next dev -p 3001   # ver los datos en la interfaz
```

Con la app apuntada a una base de prueba, no pulsar «Hacer cierre»: escribiría en Firestore.
Las pruebas usan una base SQLite temporal con las migraciones reales y nunca `prisma/dev.db`.

## Sobre el script de reproducción (histórico)

Existió un script (`scripts/repro-cierre-caja-negativo.js`, en la rama de trabajo
`fix/cierre-caja-negativo`, ninguno de los dos vive ya en el repo) que reimplementaba la
fórmula dentro de sí mismo, así que probaba su propia copia y no el código de la app; su caso
(ingreso Nequi $100 y gasto en efectivo $150 → caja física −$150) corresponde a «efectivo en
caja» y quedó cubierto por los escenarios de esta página y por `tests/cierre-caja.test.mjs`,
que sí ejercitan el código real.
