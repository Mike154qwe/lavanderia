"use client";

import Link from "next/link";
import { fmt } from "@/lib/format";

export default function PedidoLink({ id }: { id: number }) {
  return (
    <Link
      href={`/pedidos/${id}`}
      className="text-brand-500 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      #{fmt(id)}
    </Link>
  );
}
