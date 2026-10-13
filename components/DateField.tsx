"use client";

import { CalendarDays } from "lucide-react";

export default function DateField({
  name,
  defaultValue,
  display,
}: {
  name: string;
  defaultValue: string;
  display: string;
}) {
  return (
    <label className="date-field">
      <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{display}</span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        aria-label="Elegir día"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </label>
  );
}
