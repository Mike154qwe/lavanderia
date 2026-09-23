"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { money } from "@/lib/format";

export type PuntoTendencia = { fecha: string; gananciaNeta: number; efectivoEnCaja: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-white/10 dark:bg-gray-900">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="mt-0.5 text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {money(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Tendencia de ganancia neta y efectivo en caja por día -- mismo estilo que
 * los gráficos de lavanderia-local/components/charts/ (recharts, colores de
 * marca, tooltip redondeado).
 *
 * Con pocos puntos (historial recién empezando) los puntos se dibujan más
 * grandes a propósito -- una línea delgada con 2-5 puntos sueltos, sin nada
 * que resalte cada dato, se ve pobre/rota; puntos grandes y bien marcados se
 * leen como "esto es todo el historial que hay todavía", no como un error. */
export default function TrendChart({ data }: { data: PuntoTendencia[] }) {
  const pocosPuntos = data.length <= 7;
  const radioPunto = pocosPuntos ? 5 : 3;
  const radioPuntoActivo = pocosPuntos ? 7 : 5;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#98a2b3" }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#98a2b3" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="gananciaNeta"
          name="Ganancia neta"
          stroke="#465fff"
          strokeWidth={2}
          dot={{ r: radioPunto, fill: "#465fff", strokeWidth: 0 }}
          activeDot={{ r: radioPuntoActivo }}
        />
        <Line
          type="monotone"
          dataKey="efectivoEnCaja"
          name="Efectivo en caja"
          stroke="#12b76a"
          strokeWidth={2}
          dot={{ r: radioPunto, fill: "#12b76a", strokeWidth: 0 }}
          activeDot={{ r: radioPuntoActivo }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
