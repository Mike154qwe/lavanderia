import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import PanelRemotoClient from "./PanelRemotoClient";

export const metadata: Metadata = { title: "Panel remoto" };

export default async function PanelRemotoPage() {
  if (!(await estaAutenticado())) {
    redirect("/login");
  }

  return <PanelRemotoClient />;
}
