// Estadísticas SECUNDARIAS (acumulado, conteo, promedio) -- a propósito más
// chicas y sin icono que HeroCierre.tsx: son contexto de apoyo, no el dato
// que la gerente viene a buscar. Sin iconografía decorativa (un ícono de
// "calendario" o "gráfica" aquí no dice nada que el número no diga solo).
//
// El color es por SIGNIFICADO, no decoración: "ganancia neta" (aquí y en
// cualquier otra parte del panel) siempre es azul de marca; "efectivo en
// caja", siempre el mismo verde de la gráfica; un conteo simple (días con
// cierre) no tiene una cuenta de dinero detrás, así que no lleva color de
// marca -- queda neutro.
export default function KpiCard({
  label,
  value,
  tono,
  danger,
  hint,
}: {
  label: string;
  value: string;
  tono: "ganancia" | "neutro";
  danger?: boolean;
  hint?: string;
}) {
  const colorValor = danger
    ? "text-red-500"
    : tono === "ganancia"
      ? "text-brand-500"
      : "text-gray-900 dark:text-white";

  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className={`mt-1.5 text-xl font-black leading-none ${colorValor}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{hint}</p>}
    </div>
  );
}
