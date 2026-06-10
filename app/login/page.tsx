import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-2">

        {/* Panel izquierdo — solo desktop */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-500 p-12 text-white lg:flex">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow">
              🧺
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight">
              Lavaseco<br />La Manuelita
            </h1>
            <p className="mt-3 text-lg font-semibold text-brand-100">
              Sistema de gestión
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 text-sm leading-7 text-brand-100">
            Inventario · Finanzas · Pedidos<br />
            Clientes · Caja · Movimientos
          </div>
        </div>

        {/* Formulario */}
        <div className="p-10 lg:p-14">
          <h2 className="text-3xl font-black text-gray-900">
            Acceso gerente
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Ingresa con tu usuario y contraseña.
          </p>

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              Usuario o contraseña incorrectos.
            </div>
          )}

          <form action={loginAction} className="mt-8 grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Usuario
              </label>
              <input
                name="usuario"
                required
                autoComplete="username"
                className="input-modern"
                placeholder="Usuario"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input-modern"
                placeholder="Contraseña"
              />
            </div>

            <button className="btn-primary mt-2">
              Entrar al sistema
            </button>
          </form>

          <a
            href="/empleado-login"
            className="mt-8 block text-center text-sm font-semibold text-gray-400 hover:text-gray-700"
          >
            ¿Eres empleado? Ingresa aquí →
          </a>
        </div>
      </div>
    </main>
  );
}
