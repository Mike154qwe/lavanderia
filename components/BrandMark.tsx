import { WashingMachine } from "lucide-react";

export default function BrandMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const icon = Math.round(size * 0.5);
  return (
    <span
      className={`figure-well figure-well--brand ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <WashingMachine size={icon} strokeWidth={1.75} />
    </span>
  );
}
