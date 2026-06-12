"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type PuntoMes = { mes: string; entradas: number; salidas: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-black text-gray-500">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name === "entradas" ? "↑ Entradas" : "↓ Salidas"}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function MovimientosMensuales({ data }: { data: PuntoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: "#98a2b3" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#98a2b3" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => (
            <span className="text-xs font-semibold text-gray-500">
              {v === "entradas" ? "Entradas" : "Salidas"}
            </span>
          )}
        />
        <Bar dataKey="entradas" name="entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={14} />
        <Bar dataKey="salidas"  name="salidas"  fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
