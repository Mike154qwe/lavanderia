import { empleadoLoginAction } from "./actions";

export default function EmpleadoLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-teal-600 p-8">

      {/* Logo / marca */}
      <div className="mb-10 text-center text-white">
        <p className="text-8xl">🧺</p>
        <h1 className="mt-4 text-5xl font-black">La Manuelita</h1>
        <p className="mt-2 text-xl font-semibold text-teal-100">
          Lavaseco
        </p>
      </div>

      {/* Botón principal — muy grande para persona mayor */}
      <form action={empleadoLoginAction} className="w-full max-w-sm">
        <button className="w-full rounded-3xl bg-white px-8 py-8 text-3xl font-black text-teal-700 shadow-2xl transition active:scale-95">
          ✅ Ingresar
        </button>
      </form>

      <p className="mt-6 text-lg font-semibold text-teal-100">
        Toca el botón para entrar
      </p>

      {/* Link gerente — discreto, al fondo */}
      <a
        href="/login"
        className="mt-16 text-sm font-semibold text-teal-200 underline-offset-4 hover:underline"
      >
        Acceso gerente
      </a>
    </main>
  );
}
