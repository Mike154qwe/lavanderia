import { ESTADO_BADGE, estadoLabel } from "@/lib/format";

export default function EstadoBadge({
  estado,
  size = "sm",
}: {
  estado: string;
  size?: "sm" | "md";
}) {
  const color = ESTADO_BADGE[estado] ?? "bg-gray-100 text-gray-500";
  const pad = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex w-fit items-center rounded-full font-bold ${pad} ${color}`}>
      {estadoLabel(estado)}
    </span>
  );
}
