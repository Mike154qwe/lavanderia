"use client";

import { useEffect, useState } from "react";

export default function FlashMessage({
  message,
  type = "success",
}: {
  message?: string | null;
  type?: "success" | "error";
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("flash");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }, 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg ${
        type === "error" ? "bg-red-500" : "bg-emerald-500"
      }`}
    >
      {type === "error" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {message}
    </div>
  );
}
