"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { dia: string; total: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-500">Día {label}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-900">
        ${payload[0].value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

export default function IngresosDiarios({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradIngreso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#465fff" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#465fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11, fill: "#98a2b3" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#98a2b3" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#465fff", strokeWidth: 1, strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#465fff"
          strokeWidth={2}
          fill="url(#gradIngreso)"
          dot={false}
          activeDot={{ r: 4, fill: "#465fff", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
