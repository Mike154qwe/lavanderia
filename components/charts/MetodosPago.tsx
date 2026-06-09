"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Point = { metodo: string; total: number };

const COLORES: Record<string, string> = {
  Efectivo:       "#12b76a",
  Nequi:          "#465fff",
  Daviplata:      "#f79009",
  Transferencia:  "#0ba5ec",
  Tarjeta:        "#7a5af8",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-500">{payload[0].payload.metodo}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-900">
        ${payload[0].value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

export default function MetodosPago({ data }: { data: Point[] }) {
  const dataFiltrada = data.filter((d) => d.total > 0);

  if (!dataFiltrada.length) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-gray-400">
        Sin pagos registrados hoy
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={dataFiltrada} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#98a2b3" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          dataKey="metodo"
          type="category"
          tick={{ fontSize: 12, fill: "#667085", fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          width={88}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {dataFiltrada.map((entry) => (
            <Cell key={entry.metodo} fill={COLORES[entry.metodo] ?? "#465fff"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
