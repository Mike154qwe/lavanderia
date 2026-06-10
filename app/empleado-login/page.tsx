import { empleadoLoginAction } from "./actions";

export default function EmpleadoLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-brand-500 p-8">

      {/* Logo / marca */}
      <div className="mb-10 text-center text-white">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 text-5xl shadow-lg">
          🧺
        </div>
        <h1 className="text-5xl font-black">La Manuelita</h1>
        <p className="mt-2 text-xl font-semibold text-brand-100">
          Lavaseco
        </p>
      </div>

      {/* Botón principal — muy grande para persona mayor */}
      <form action={empleadoLoginAction} className="w-full max-w-sm">
        <button className="w-full rounded-2xl bg-white px-8 py-8 text-3xl font-black text-brand-600 shadow-2xl transition active:scale-95 hover:bg-brand-50">
          ✅ Ingresar
        </button>
      </form>

      <p className="mt-6 text-lg font-semibold text-brand-100">
        Toca el botón para entrar
      </p>

      {/* Link gerente — discreto, al fondo */}
      <a
        href="/login"
        className="mt-16 text-sm font-semibold text-brand-200 underline-offset-4 hover:underline"
      >
        Acceso gerente
      </a>
    </main>
  );
}
