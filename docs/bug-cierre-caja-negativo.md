# Bug: «Total caja» / «Caja esperada» negativo (diagnóstico)

**Estado:** diagnosticado y reproducido con test automatizado. **La lógica NO se ha corregido.**
**Rama:** `fix/cierre-caja-negativo` · **Test:** `npm run test:caja` (hoy: 3 fallan, 1 pasa)

## Resumen

La app calcula la caja como **todos los pagos, de cualquier medio, menos todos los gastos,
de cualquier medio**:

```
efectivo + nequi + daviplata + transferencia + tarjeta − gastos
```

Pero `GastoCaja.metodo` (Efectivo, Nequi, Daviplata, Transferencia) **nunca entra en el
cálculo**: solo se muestra en pantalla. Un gasto pagado por Nequi resta de la «caja» aunque
no haya salido ni un peso del cajón, y un pago por Nequi la infla aunque no haya entrado
efectivo. El resultado puede ser negativo (o simplemente incorrecto) sin que el cajón físico
lo esté.

## Qué se está probando (supuesto explícito)

El test define «caja» como **caja física**: `efectivo cobrado − gastos pagados en efectivo`.
Sale de dos sitios: el repro de origen (`origin/fix/cierre-caja-negativo`, variable
`totalCajaFisicaEsperada`) y la etiqueta «Caja esperada» (lo que debería haber en el cajón al
contar). Si negocio decide que «caja» significa el neto de todos los medios, la conclusión
cambia; ver «Decisión pendiente».

## Dónde está la fórmula (4 copias, ninguna mira el medio del gasto)

| Archivo | Línea | Expresión |
|---|---|---|
| `app/gerente/page.tsx` (`hacerCierreCaja`, lo que se **guarda**) | 75 | `efectivo + nequi + daviplata + transferencia + tarjeta - totalGastos` |
| `app/gerente/page.tsx` (KPI «Caja esperada») | 240 | `totalRecibido - totalGastos` |
| `app/gerente/dia/[fecha]/page.tsx` («Caja esperada») | 138 | `totalRecibido - totalGastos` |
| `app/cierres-caja/[id]/ticket/route.ts` («Total caja» impreso) | 99 | `totalRecibido - totalGastos` |

## Reproducción exacta

Datos de prueba, en una **base SQLite temporal** (migraciones reales; `prisma/dev.db` no se
toca), con responsable **«Prueba QA - bug caja»** en clientes, gastos y cierres.

| # | Escenario | Fórmula actual | Caja física | Resultado |
|---|---|---|---|---|
| 0 | Control: efectivo $100.000, gasto en efectivo $30.000 | $70.000 | $70.000 | pasa |
| 1 | Réplica del 11-jun: efectivo $130.500 + digital $87.000; **nómina $400.000 por Nequi** | **−$182.500** | **+$130.500** | **falla** |
| 2 | Repro de Joel: ingreso Nequi $100.000; gasto en efectivo $150.000 | −$50.000 | −$150.000 | **falla** |
| 3 | Réplica del cierre #14 (12-jun): ef. $83.580 + transf. $15.840; gastos transf. $18.000 + efectivo $45.000 | $36.420 | $38.580 | **falla** |

- El **1** es el «negativo falso»: el cajón tiene +$130.500 y la app dice −$182.500.
- El **2** es el inverso: la app dice −$50.000, pero al cajón le faltan $150.000 (se subestima el faltante).
- El **0** pasa a propósito: demuestra que los fallos no son del arnés de prueba.

El test ejecuta el `GET` **real** de la ruta del ticket, que recalcula «Total caja» desde la BD.
Además se comprobó en la interfaz (servidor de desarrollo apuntado a la BD QA, solo `GET`):
el KPI de `/gerente`, `/gerente/dia/[fecha]`, el ticket y la tarjeta del cierre muestran los
mismos números que el test (−$182.500 / −$50.000 / $36.420).

## Evidencia con datos reales (`prisma/dev.db`, solo lectura sobre una copia)

- **74 % del valor gastado no es efectivo:** $783.000 de $1.058.000
  (Nequi $450.000, Daviplata $315.000, Transferencia $18.000; efectivo $275.000).
- De los 2 cierres guardados en negativo:
  - **#1 (29-may): −$35.000 es un negativo falso.** Gastos $50.000, todos por medios digitales;
    efectivo cobrado $10.000 → caja física **+$10.000**.
  - **#7 (30-may): −$50.000 es un negativo legítimo.** Gasto de $50.000 en efectivo sin
    ingreso en efectivo en esa ventana; fórmula y caja física coinciden.
- **#14 (12-jun):** guardado $36.420; caja física $38.580.
- El KPI del 11-jun marca −$182.500 (nómina por Nequi de $400.000) con +$130.500 en efectivo.

## Causa exacta

1. Las cuatro copias suman `pagos` de **todos** los medios y restan `gastos` de **todos** los
   medios (`sumarMetodo` solo se usa para desglosar pagos, nunca gastos).
2. `GastoCaja.metodo` existe y el formulario del gerente (`/gerente/dia/[fecha]`) lo captura,
   pero ningún cálculo lo lee. (El formulario del empleado, `/gastos-empleado`, no pide el
   medio: `registrarGastoEmpleado` guarda «Efectivo» por defecto; ver «Factores relacionados».)
3. El nombre y el uso del resultado («Caja esperada», «Total caja» en el ticket) implican caja
   física; la fórmula calcula otra cosa (neto de todas las cuentas).

## Factores relacionados (no son la causa, pero conviene tenerlos presentes)

- **Cada cierre es una ventana, no un saldo.** Cuenta lo posterior al último cierre del día;
  una ventana con gasto en efectivo y sin ingreso da negativo legítimo (#7).
- **El total guardado y el del ticket pueden diferir.** El total se guarda al cerrar, pero el
  ticket recalcula con los movimientos actuales: en los datos reales, #8 guardó $30.000 y el
  ticket recalcula $40.500; #12 guardó $45.000 y el ticket recalcula −$355.000 (hay un gasto
  de $400.000 fechado antes del cierre que el cierre no vio). Un gasto puede quedar fechado
  en el pasado: `/gerente/dia/[fecha]` guarda `createdAt = fecha + "T12:00:00"` sin importar
  cuándo se registra (línea 26). No se determinó cómo se creó el gasto del #12.
- **Los gastos del empleado siempre quedan como «Efectivo»:** su formulario no incluye el
  medio y el servidor usa «Efectivo» por defecto. Si la caja pasa a ser física (opción A), un
  gasto pagado por Nequi desde el mostrador se descontaría del cajón por error, así que ese
  formulario también tendría que pedir el medio.
- `money()` imprime negativos como `$-182.500` (cosmético).
- El total guardado es el que se sincroniza con Firestore para el panel remoto, así que el
  panel remoto hereda el mismo cálculo.

## Decisión pendiente (no implementada)

¿Qué significa «caja»?

- **A. Caja física (recomendada):** `efectivo − gastos en efectivo`. Cambia las 4 copias, el
  rótulo del ticket y del cierre, y no reinterpreta los cierres históricos (habría que
  decidir cómo mostrarlos). Sin cambio de esquema se puede calcular desde los movimientos,
  pero el registro `CierreCaja` no guarda «gastos en efectivo» (solo `gastos` total): un
  campo nuevo requeriría migración y aprobación aparte.
- **B. Neto de todos los medios:** la fórmula actual es coherente, pero hay que renombrar
  «Caja esperada» (p. ej. «Neto del día») y mostrar el efectivo aparte. El escenario 1 dejaría
  de ser un bug y habría que reescribir el test.

Recomendación al corregir: extraer el cálculo a una sola función compartida por las cuatro
copias. Hoy `hacerCierreCaja` no es invocable desde un test (está dentro del módulo de la
página y además escribe en Firestore), así que su valor guardado solo se cubre de forma
indirecta.

## Cómo ejecutar

```bash
npm run test:caja                     # hoy: 3 fallan, 1 pasa (exit 1). Tras el arreglo: 4 pasan
KEEP_QA_DB=1 npm run test:caja        # conserva la BD temporal e imprime su ruta
DATABASE_URL=file:<ruta> npx next dev -p 3001   # ver los datos en la interfaz
```

Con la app apuntada a la BD QA usar **solo `GET`**: pulsar «Hacer cierre» escribiría en
Firestore (panel remoto). Borrar la carpeta temporal al terminar.

## Sobre el script de `origin/fix/cierre-caja-negativo`

`scripts/repro-cierre-caja-negativo.js` reimplementa la fórmula dentro del propio script, así
que prueba su copia y no el código de la app. Este test ejecuta el código real de la ruta del
ticket.
