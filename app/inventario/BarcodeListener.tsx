"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, ScanLine } from "lucide-react";

export default function BarcodeListener() {
  const router  = useRouter();
  const buffer  = useRef("");
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKey = useRef<number>(0);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [flash,  setFlash]  = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ahora = Date.now();
      const intervalo = ahora - lastKey.current;
      lastKey.current = ahora;

      if (intervalo > 300 && buffer.current.length > 0) {
        buffer.current = "";
      }

      if (e.key === "Enter") {
        const codigo = buffer.current.trim();
        buffer.current = "";

        if (/^\d{3,10}$/.test(codigo)) {
          const id = String(parseInt(codigo, 10));
          setUltimo(codigo);
          setFlash(true);
          setTimeout(() => setFlash(false), 1500);
          router.push(`/inventario?q=${id}&scan=1`);
        }
        return;
      }

      if (/^\d$/.test(e.key)) {
        buffer.current += e.key;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { buffer.current = ""; }, 500);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      className={`flex items-center gap-2.5 rounded-[var(--radius-well)] px-4 py-2.5 text-sm font-bold ${
        flash
          ? "bg-emerald-600 text-white"
          : "bg-[color:var(--surface-2)] text-[color:var(--text-3)] ring-1 ring-[color:var(--border-1)]"
      }`}
    >
      {flash ? (
        <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
      ) : (
        <ScanLine size={16} strokeWidth={1.75} aria-hidden="true" />
      )}
      <span>
        {flash && ultimo
          ? `Buscando recibo #${String(parseInt(ultimo, 10)).padStart(5, "0")}…`
          : "Listo para escanear"}
      </span>
    </div>
  );
}
