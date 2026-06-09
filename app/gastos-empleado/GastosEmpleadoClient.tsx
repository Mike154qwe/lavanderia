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
        className="mt-0 w-full rounded-3xl border-2 border-slate-200 p-6 text-3xl font-black focus:border-red-400 focus:outline-none"
      />

      <div className="mt-4">
        <p className="mb-3 text-lg font-black text-slate-600">
          Valores rápidos
        </p>
        <div className="grid grid-cols-5 gap-3">
          {VALORES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => ponerValor(v)}
              className="rounded-2xl bg-slate-100 p-4 text-base font-black text-slate-700 transition hover:bg-red-100 hover:text-red-700 active:scale-95"
            >
              ${v.toLocaleString("es-CO")}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
