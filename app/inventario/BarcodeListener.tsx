"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function BarcodeListener() {
  const router  = useRouter();
  const buffer  = useRef("");
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKey = useRef<number>(0);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [flash,  setFlash]  = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignorar si el foco está en un input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ahora = Date.now();
      const intervalo = ahora - lastKey.current;
      lastKey.current = ahora;

      // Si pasaron más de 300ms desde la última tecla, resetear buffer
      // (distingue escritura humana de escaneo rápido)
      if (intervalo > 300 && buffer.current.length > 0) {
        buffer.current = "";
      }

      if (e.key === "Enter") {
        const codigo = buffer.current.trim();
        buffer.current = "";

        // Solo procesar si parece un código de barras (solo dígitos, 3-10 chars)
        if (/^\d{3,10}$/.test(codigo)) {
          const id = String(parseInt(codigo, 10)); // quita ceros al frente
          setUltimo(codigo);
          setFlash(true);
          setTimeout(() => setFlash(false), 1500);
          router.push(`/inventario?q=${id}&scan=1`);
        }
        return;
      }

      // Acumular solo dígitos
      if (/^\d$/.test(e.key)) {
        buffer.current += e.key;

        // Limpiar buffer si no llega Enter en 500ms
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { buffer.current = ""; }, 500);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
        flash
          ? "bg-green-500 text-white shadow-lg shadow-green-200"
          : "bg-gray-100 text-gray-400"
      }`}
    >
      <span className={`text-base transition-transform ${flash ? "scale-125" : ""}`}>
        {flash ? "✅" : "📷"}
      </span>
      <span>
        {flash && ultimo
          ? `Buscando recibo #${String(parseInt(ultimo, 10)).padStart(5, "0")}…`
          : "Listo para escanear"}
      </span>
    </div>
  );
}
