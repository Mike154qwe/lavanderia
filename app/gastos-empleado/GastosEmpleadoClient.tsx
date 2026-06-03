"use client";

const valoresRapidos = [
  5000,
  10000,
  20000,
  50000,
  100000,
];

export default function GastosEmpleadoClient() {
  function ponerValor(valor: number) {
    const input =
      document.querySelector<HTMLInputElement>(
        'input[name="valor"]'
      );

    if (input) {
      input.value = String(valor);

      input.dispatchEvent(
        new Event("input", {
          bubbles: true,
        })
      );
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-3 text-lg font-black text-slate-700">
        Valores rápidos
      </p>

      <div className="grid gap-3 md:grid-cols-5">
        {valoresRapidos.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => ponerValor(valor)}
            className="rounded-2xl bg-slate-100 p-4 text-lg font-black text-slate-700 transition hover:bg-red-100 hover:text-red-600"
          >
            ${valor.toLocaleString("es-CO")}
          </button>
        ))}
      </div>
    </div>
  );
}