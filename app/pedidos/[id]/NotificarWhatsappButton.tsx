"use client";

export default function NotificarWhatsappButton({
  pedidoId,
  href,
  yaEnviado,
  action,
}: {
  pedidoId: number;
  href: string;
  yaEnviado: boolean;
  action: (formData: FormData) => void;
}) {
  // Abre WhatsApp en una pestaña nueva y, en la misma, deja que el form siga su
  // curso normal (server action que registra el envío en HistorialEstado).
  function handleSubmit() {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <button
        type="submit"
        className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.532 5.855L.057 23.857a.5.5 0 0 0 .604.677l6.234-1.635A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.167-1.438l-.37-.22-3.843 1.007 1.027-3.748-.241-.385A9.954 9.954 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        {yaEnviado ? "Reenviar por WhatsApp" : "Notificar por WhatsApp"}
      </button>
    </form>
  );
}
