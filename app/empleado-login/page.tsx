import { empleadoLoginAction } from "./actions";

export default function EmpleadoLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 p-6">
      <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl rounded-[36px] bg-white p-10 text-center shadow-2xl">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-teal-50 text-5xl">
            🧺
          </div>

          <h1 className="mt-8 text-5xl font-black text-slate-900">
            Lavaseco
          </h1>

          <p className="mt-2 text-xl font-bold text-teal-600">
            La Manuelita
          </p>

          <p className="mt-6 text-slate-500">
            Acceso rápido para empleados.
          </p>

          <form action={empleadoLoginAction} className="mt-8">
            <button className="w-full rounded-2xl bg-teal-500 px-8 py-5 text-xl font-black text-white shadow-lg shadow-teal-200 hover:bg-teal-600">
              Ingresar como empleado
            </button>
          </form>

          <a
            href="/login"
            className="mt-6 inline-block text-sm font-bold text-slate-500 hover:text-slate-900"
          >
            Ingresar como gerente
          </a>
        </div>
      </section>
    </main>
  );
}