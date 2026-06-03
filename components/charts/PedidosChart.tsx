"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { dia: "Lun", pedidos: 12 },
  { dia: "Mar", pedidos: 19 },
  { dia: "Mie", pedidos: 8 },
  { dia: "Jue", pedidos: 15 },
  { dia: "Vie", pedidos: 22 },
  { dia: "Sab", pedidos: 30 },
];

export default function PedidosChart() {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="dia" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="pedidos"
            fill="#2563eb"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}