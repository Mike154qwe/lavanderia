import type { LucideProps } from "lucide-react";
import {
  BedDouble,
  Briefcase,
  Droplets,
  Flame,
  Grid3x3,
  Layers,
  Palette,
  Pencil,
  PersonStanding,
  Shirt,
  SportShoe,
} from "lucide-react";

type IconComp = (props: LucideProps) => React.ReactNode;

function PantsIcon({ size = 24, className, strokeWidth = 1.75 }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3h10l1.4 18h-4.6l-1.3-9-1.3 9H5.6L7 3z" />
      <path d="M12 3v7" />
    </svg>
  );
}

function JacketIcon({ size = 24, className, strokeWidth = 1.75 }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 4h8l2 4v12a1 1 0 0 1-1 1h-3v-7h-4v7H7a1 1 0 0 1-1-1V8l2-4z" />
      <path d="M8 4c.4 2.4 1.8 3.5 4 3.5S15.6 6.4 16 4" />
      <path d="M7 8 4 11v4" />
      <path d="m17 8 3 3v4" />
    </svg>
  );
}

const PRENDA_ICONS: Record<string, IconComp> = {
  Camisa: Shirt,
  "Pantalón": PantsIcon,
  Chaqueta: JacketIcon,
  Cubrelecho: BedDouble,
  Tenis: SportShoe,
  Traje: Briefcase,
  Vestido: PersonStanding,
  Cobija: Layers,
  Tapete: Grid3x3,
  Otro: Pencil,
};

const SERVICIO_ICONS: Record<string, IconComp> = {
  Lavado: Droplets,
  Planchado: Flame,
  Tintura: Palette,
};

function wrap(animated: boolean, node: React.ReactNode) {
  if (!animated) return node;
  return <span className="icon-motion">{node}</span>;
}

export function PrendaIcon({
  tipo,
  size = 24,
  animated = false,
  className,
}: {
  tipo: string;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const Icon = PRENDA_ICONS[tipo] ?? Shirt;
  return wrap(
    animated,
    <Icon size={size} strokeWidth={1.75} className={className} aria-hidden="true" />,
  );
}

export function ServicioIcon({
  nombre,
  size = 24,
  animated = false,
  className,
}: {
  nombre: string;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const Icon = SERVICIO_ICONS[nombre] ?? Droplets;
  return wrap(
    animated,
    <Icon size={size} strokeWidth={1.75} className={className} aria-hidden="true" />,
  );
}
