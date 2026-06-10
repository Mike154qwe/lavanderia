"use client";

import { useRef } from "react";

const VALORES = [5_000, 10_000, 20_000, 50_000, 100_000];

export default function GastosEmpleadoClient() {
  const inputRef = useRef<HTMLInputElement>(null);

  function ponerValor(valor: number) {
    if (!inputRef.current) return;
    inputRef.current.value = String(valor);
    inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    inputRef.current.focus();
  }

  return (
    <>
      <input
        ref={inputRef}
        name="valor"
        type="number"
        min="0"
        step="1000"
        required
        placeholder="Valor del gasto"
        className="input-modern text-lg font-bold"
      />
      <div className="mt-3 grid grid-cols-5 gap-2">
        {VALORES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => ponerValor(v)}
            className="rounded-xl bg-gray-100 py-2.5 text-xs font-black text-gray-700 transition hover:bg-red-100 hover:text-red-700 active:scale-95 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-red-500/20 dark:hover:text-red-400"
          >
            ${v.toLocaleString("es-CO")}
          </button>
        ))}
      </div>
    </>
  );
}
