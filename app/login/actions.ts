"use server";

import { redirect } from "next/navigation";
import { crearSesion } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const usuario = String(formData.get("usuario") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const userOk = usuario === process.env.GERENTE_USER;
  const passOk = password === process.env.GERENTE_PASSWORD;

  if (!userOk || !passOk) {
    redirect("/login?error=1");
  }

  await crearSesion();

  redirect("/gerente");
}