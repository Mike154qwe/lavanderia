"use client";

import { useState } from "react";

export default function MoneyInput({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: number;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(
    defaultValue
      ? defaultValue.toLocaleString("es-CO")
      : ""
  );

  const [realValue, setRealValue] = useState(
    defaultValue?.toString() || ""
  );

  function handleChange(value: string) {
    const onlyNumbers = value.replace(/\D/g, "");

    setRealValue(onlyNumbers);

    if (!onlyNumbers) {
      setDisplay("");
      return;
    }

    setDisplay(
      Number(onlyNumbers).toLocaleString("es-CO")
    );
  }

  return (
    <>
      <input
        type="hidden"
        name={name}
        value={realValue}
      />

      <input
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="money-input rounded-xl border p-3 text-sm"
      />
    </>
  );
}