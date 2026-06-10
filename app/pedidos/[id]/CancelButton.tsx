"use client";

export default function CancelButton({
  pedidoId,
  action,
}: {
  pedidoId: number;
  action: (formData: FormData) => void;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "¿Seguro que quieres cancelar este pedido?\nEsta acción no se puede deshacer."
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="estado" value="CANCELADO" />
      <button
        type="submit"
        className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
      >
        Cancelar pedido
      </button>
    </form>
  );
}
