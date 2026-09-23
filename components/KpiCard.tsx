// Mismo patrón visual que KpiCard en lavanderia-local/app/gerente/page.tsx
// (icono en chip de color, valor grande, etiqueta chica) -- copiado a mano
// para que el dashboard se sienta parte del mismo sistema.
export default function KpiCard({
  label,
  value,
  color,
  icon,
  danger,
  hint,
}: {
  label: string;
  value: string;
  color: "green" | "blue" | "red" | "purple";
  icon: string;
  danger?: boolean;
  hint?: string;
}) {
  const palette = {
    green: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    red: "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];

  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${palette}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
          {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
        </svg>
      </div>
      <p className={`text-2xl font-black ${danger ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-gray-400">{hint}</p>}
    </div>
  );
}
