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
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {VALORES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => ponerValor(v)}
            className="rounded-[var(--radius-well)] bg-[color:var(--surface-2)] py-2 text-[11px] font-bold text-[color:var(--text-2)] transition hover:bg-red-100 hover:text-red-700 active:scale-95 sm:py-2.5 sm:text-xs dark:hover:bg-red-500/20 dark:hover:text-red-400"
          >
            ${v.toLocaleString("es-CO")}
          </button>
        ))}
      </div>
    </>
  );
}
