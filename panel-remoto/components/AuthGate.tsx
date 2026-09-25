"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Puerta de acceso real con Firebase Auth. A propósito, NO reutiliza la
// cookie simple del sistema local (empleado_activo, lib/empleado-auth.ts):
// ese mecanismo depende de que el navegador esté en la misma red que el
// servidor y de que ya haya un control de acceso físico al mostrador. Este
// sitio sí queda expuesto a internet entero (Firebase Hosting), así que
// necesita autenticación real -- correo + contraseña verificados por
// Firebase, no una marca de "ya entré" sin verificar nada.
//
// Mientras Firebase no confirme el estado de sesión (usuario === undefined,
// justo al cargar la página) NO se muestra nada del panel -- ni siquiera el
// formulario de login "vacío" sobre un fondo con datos. Sin sesión válida,
// solo se renderiza el formulario: cero datos, ni el estado gris/ámbar de
// Dashboard (children, ver app/page.tsx), que ni se monta.
export default function AuthGate({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUsuario(u)), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEntrando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      // Mensaje genérico a propósito (RF: no dar pistas de cuál campo
      // falló): Firebase Auth ya unifica "correo no existe" y "contraseña
      // incorrecta" bajo el mismo error (auth/invalid-credential), y aquí
      // se trata igual cualquier otro fallo de inicio de sesión.
      setError("Correo o contraseña incorrectos.");
    } finally {
      setEntrando(false);
    }
  }

  if (usuario === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm font-semibold text-gray-400">Verificando sesión…</p>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Gerente</p>
          <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">Panel remoto</h1>
          <p className="mt-1 text-sm text-gray-500">Inicia sesión para ver los datos.</p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Correo</label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Contraseña</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

          <button type="submit" disabled={entrando} className="btn-primary mt-5 w-full">
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3 p-4">
        <span className="text-xs text-gray-400">{usuario.email}</span>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="text-xs font-bold text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300"
        >
          Cerrar sesión
        </button>
      </div>
      {children}
    </div>
  );
}
