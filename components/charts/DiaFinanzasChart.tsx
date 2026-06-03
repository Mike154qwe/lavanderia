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

export default function DiaFinanzasChart({
  prendas,
  entregados,
  recibido,
}: {
  prendas: number;
  entregados: number;
  recibido: number;
}) {
  const operacionData = [
    { name: "Prendas recibidas", valor: prendas },
    { name: "Pedidos entregados", valor: entregados },
  ];

  const dineroData = [
    { name: "Dinero recibido", valor: recibido },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Movimiento operativo
        </h3>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={operacionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="valor" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Movimiento económico
        </h3>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dineroData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  `$${Number(value).toLocaleString("es-CO")}`
                }
              />
              <Bar dataKey="valor" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}