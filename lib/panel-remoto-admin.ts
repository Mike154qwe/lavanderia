import { existsSync, readFileSync } from "fs";
import path from "path";
import type { PanelRemotoData } from "@/lib/panel-remoto";
import { COLECCION_PANEL_REMOTO } from "@/lib/panel-remoto";

// Escritura de panelRemoto vía Admin SDK (cuenta de servicio) -- APARTE de
// lib/panel-remoto.ts a propósito, no por gusto de organización: ese otro
// archivo lo importa app/gerente/remoto/PanelRemotoClient.tsx ("use client"),
// y firebase-admin arrastra paquetes de solo-Node (@google-cloud/firestore,
// grpc) que rompen el build del navegador en cuanto son alcanzables desde un
// componente cliente -- ni siquiera un import dinámico adentro de una
// función alcanza, porque Turbopack igual lo sigue para armar el bundle
// (mensaje real visto: "the chunking context does not support external
// modules: node:net"). Este archivo SOLO lo importa hacerCierreCaja
// (app/gerente/page.tsx, "use server"), así que nunca es parte del grafo
// del cliente.
//
// Por qué el Admin SDK y no el SDK web: firestore.rules exige
// `allow write: if false` para panelRemoto desde el cierre de emergencia del
// 21-sep-2026 (solo la cuenta de servicio escribe) -- con el SDK web, cada
// cierre de caja fallaba en silencio (PERMISSION_DENIED, atrapado por el
// try/catch de hacerCierreCaja) y el panel remoto público dejó de recibir
// datos nuevos desde entonces. Confirmado en producción: el cierre #19
// (22-sep-2026, 18:13:27) generó exactamente ese error un segundo después,
// en pm2 logs lavanderia-error.log. Mismo patrón de cuenta de servicio
// (FIREBASE_SERVICE_ACCOUNT_PATH) que ya usan scripts/backfill-panel-remoto.ts
// y scripts/respaldo-db-firebase.js.

async function clienteFirestoreAdmin() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    const rutaClave = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!rutaClave) {
      throw new Error(
        "Falta FIREBASE_SERVICE_ACCOUNT_PATH en .env -- ruta al JSON de la cuenta de servicio del Admin SDK."
      );
    }
    const rutaAbsoluta = path.resolve(rutaClave);
    if (!existsSync(rutaAbsoluta)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH apunta a un archivo que no existe: ${rutaAbsoluta}`);
    }
    const credenciales = JSON.parse(readFileSync(rutaAbsoluta, "utf8"));
    initializeApp({ credential: cert(credenciales) });
  }

  return getFirestore();
}

/** Reemplaza el documento del día con los datos dados. Propaga cualquier
 * error (red, credenciales faltantes, etc.); hacerCierreCaja la llama dentro
 * de su propio try/catch, así que un fallo acá nunca revierte el cierre. */
export async function guardarPanelRemotoEnFirestore(datos: PanelRemotoData): Promise<void> {
  const dbAdmin = await clienteFirestoreAdmin();
  await dbAdmin.collection(COLECCION_PANEL_REMOTO).doc(datos.fecha).set(datos);
}
