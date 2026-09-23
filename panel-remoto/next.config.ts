import type { NextConfig } from "next";

// Exportación estática: esta pantalla es 100% cliente (Firebase Auth,
// Firestore y la caché en IndexedDB corren todos en el navegador), no usa
// nada de servidor -- por eso no hace falta Cloud Functions/Cloud Run para
// servirla, solo Firebase Hosting sirviendo archivos estáticos.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
