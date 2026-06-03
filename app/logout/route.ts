import { cerrarSesion } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function GET() {
  await cerrarSesion();
  redirect("/login");
}