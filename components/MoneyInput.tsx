"use client";

import { useEffect, useState } from "react";

export default function MoneyInput({
  name,
  defaultValue,
  value,
  placeholder,
}: {
  name: string;
  defaultValue?: number;
  /** Para autocompletar el campo desde afuera (ej. tarifario). Deja el
   * campo intacto si es `undefined`; lo limpia si es `null`. El usuario
   * puede seguir editando el valor libremente después. */
  value?: number | null;
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

  useEffect(() => {
    if (value === undefined) return;

    setRealValue(value === null ? "" : String(value));
    setDisplay(value === null ? "" : value.toLocaleString("es-CO"));
  }, [value]);

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
        className="input-modern"
      />
    </>
  );
}