import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "1";

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-violet-900 to-purple-700 p-6">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[36px] bg-white shadow-2xl lg:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-indigo-950 to-violet-700 p-12 text-white lg:block">
            <h1 className="text-5xl font-black">Lavaseco</h1>
            <p className="mt-2 text-2xl font-bold text-violet-200">
              La Manuelita
            </p>

            <div className="mt-16 rounded-3xl bg-white/10 p-8">
              <p className="text-lg font-bold">
                Sistema privado de gerencia
              </p>

              <p className="mt-3 text-sm leading-6 text-violet-100">
                Control de inventario, finanzas, pedidos, clientes, caja,
                movimientos y recibos.
              </p>
            </div>
          </div>

          <div className="p-10 lg:p-14">
            <h2 className="text-4xl font-black text-slate-900">
              Iniciar sesión
            </h2>

            <p className="mt-2 text-slate-500">
              Ingresa con el usuario y contraseña del gerente.
            </p>

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-600">
                Usuario o contraseña incorrectos.
              </div>
            )}

            <form action={loginAction} className="mt-8 grid gap-5">
              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Usuario
                </label>

                <input
                  name="usuario"
                  required
                  className="input-modern"
                  placeholder="Usuario"
                />
              </div>

              <div>
                <label className="mb-2 block font-bold text-slate-700">
                  Contraseña
                </label>

                <input
                  name="password"
                  type="password"
                  required
                  className="input-modern"
                  placeholder="Contraseña"
                />
              </div>

              <button className="btn-primary mt-2">
                Entrar al sistema
              </button>
              <a
  href="/empleado-login"
  className="mt-5 block text-center text-sm font-bold text-teal-600 hover:text-teal-700"
>
  Ingresar como empleado
</a>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}