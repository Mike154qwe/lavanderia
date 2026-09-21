# Cierre de caja: «caja negativa» — diagnóstico y resolución

**Estado:** resuelto en código por la **separación de métricas** decidida con el negocio el
21-sep-2026. **Sin publicar ni desplegar** (rama `fix/cierre-caja-negativo`, solo local).
**Pruebas:** `npm run test:caja` (24) y `npm run test:rnf04` (32).

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

## Lo que no resuelve la separación (pendiente)

1. **El efectivo en caja es un movimiento, no un saldo.** El modelo no guarda un fondo
   inicial de caja; el cajón real es el fondo con el que se empezó más este número. Un
   «efectivo en caja» negativo (Joel: −$150.000) significa que el cajón pagó en efectivo más
   de lo que recibió en esa ventana. Guardar el fondo inicial exigiría un campo nuevo y una
   migración, que requieren aprobación aparte.
2. **Los gastos que registra el empleado siempre quedan como «Efectivo».** Su formulario
   (`/gastos-empleado`) no pide el medio y el servidor usa «Efectivo» por defecto. Con el
   nuevo cálculo, un gasto pagado por Nequi desde el mostrador se descontaría del efectivo
   en caja por error. Ese formulario debería pedir el medio.
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
5. **`money()` imprime los negativos como `$-182.500`** en vez de `-$182.500` (cosmético,
   global).
6. **El panel remoto** (`/gerente/remoto`, hoy sin datos por Firestore cerrado) sigue
   diciendo «Total caja» y recibe la ganancia neta. No se tocó.

## Cambio de comportamiento a tener en cuenta

`/gerente/dia/[fecha]` calculaba «Recibido» sumando **todos** los pagos de los pedidos
creados (o con movimiento de historial) ese día, aunque se hubieran pagado otro día, y el
valor cambiaba con el buscador. Ahora usa los pagos del día por su fecha, igual que
`/gerente` y el cierre. Con los datos reales solo cambia el 11-jun: $373.500 → $217.500.

## Cómo ejecutar

```bash
npm run test:caja                      # 24 pruebas: unitarias, ticket real y estáticas
KEEP_QA_DB=1 npm run test:caja         # conserva la BD temporal (responsable «Prueba QA - bug caja»)
DATABASE_URL=file:<ruta> npx next dev -p 3001   # ver los datos en la interfaz
```

Con la app apuntada a una base de prueba, no pulsar «Hacer cierre»: escribiría en Firestore.
Las pruebas usan una base SQLite temporal con las migraciones reales y nunca `prisma/dev.db`.

## Sobre el script de `origin/fix/cierre-caja-negativo`

`scripts/repro-cierre-caja-negativo.js` reimplementa la fórmula dentro del propio script, así
que prueba su copia y no el código de la app; su caso (ingreso Nequi $100 y gasto en efectivo
$150 → caja física −$150) corresponde a «efectivo en caja» y está cubierto aquí.
