"use client";

import Link from "next/link";
import { money, fmt } from "@/lib/format";

// Extraído de page.tsx (que es un Server Component -- consulta Prisma
// directamente): el <Link> de acá abajo necesita onClick para que el clic en
// el número de recibo no togglee el <details> que lo envuelve, y una función
// no se puede pasar como prop a un Client Component (como Link) desde un
// Server Component. Este archivo recibe los datos ya resueltos por la
// página, nunca la consulta en sí.
export default function PedidoRow({ pedido, tipo, fechaMovimiento }: { pedido: any; tipo: string; fechaMovimiento?: Date }) {
  const abonado     = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  const saldo       = pedido.total - abonado;
  const totalPrendas = pedido.prendas.reduce((s: number, pr: any) => s + pr.cantidad, 0);

  return (
    <details className="group rounded-xl border border-gray-100 dark:border-white/[0.07]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/pedidos/${pedido.id}`} className="font-mono text-sm font-bold text-brand-500 hover:underline" onClick={(e) => e.stopPropagation()}>
              #{fmt(pedido.id)}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tipo === "Entrada" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"}`}>
              {tipo}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-bold text-gray-800">{pedido.cliente.nombre}</p>
          <p className="text-xs text-gray-400">
            {totalPrendas} prendas · {money(pedido.total)} ·{" "}
            {(fechaMovimiento || pedido.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400 transition duration-200 group-open:rotate-180">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-white/[0.07]">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 py-2 dark:bg-white/5">
            <p className="text-xs text-gray-400">Total</p>
            <p className="mt-0.5 text-sm font-black text-gray-900">{money(pedido.total)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2 dark:bg-white/5">
            <p className="text-xs text-gray-400">Abonado</p>
            <p className="mt-0.5 text-sm font-black text-green-600">{money(abonado)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2 dark:bg-white/5">
            <p className="text-xs text-gray-400">Saldo</p>
            <p className={`mt-0.5 text-sm font-black ${saldo > 0 ? "text-red-500" : "text-green-600"}`}>{money(saldo)}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {pedido.prendas.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-white/[0.07]">
              <div>
                <span className="text-sm font-semibold text-gray-800">{p.tipo}</span>
                <span className="ml-1.5 text-xs text-gray-400">×{p.cantidad} · {p.servicio}</span>
              </div>
              <span className="text-sm font-bold text-brand-500">{money(p.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
