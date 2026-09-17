const assert = require("node:assert/strict");

function calcularTotalCajaActual(pagos, gastos) {
  const totalRecibido = pagos.reduce((total, pago) => total + pago.valor, 0);
  const totalGastos = gastos.reduce((total, gasto) => total + gasto.valor, 0);
  return totalRecibido - totalGastos;
}

const pagos = [{ valor: 100, metodo: "Nequi" }];
const gastos = [{ valor: 150, metodo: "Efectivo" }];

const totalCajaActual = calcularTotalCajaActual(pagos, gastos);
const totalCajaFisicaEsperada = -150;

assert.equal(
  totalCajaActual,
  totalCajaFisicaEsperada,
  [
    "Reproducción del bug de cierre de caja:",
    `- Pagos: $${pagos[0].valor} por ${pagos[0].metodo}`,
    `- Gastos: $${gastos[0].valor} por ${gastos[0].metodo}`,
    `- Fórmula actual: $${totalCajaActual}`,
    `- Caja física esperada: $${totalCajaFisicaEsperada}`,
  ].join("\n")
);
