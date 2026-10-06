export default function FieldIcon({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`field-icon ${className ?? ""}`}>
      <span className="field-icon__mark" aria-hidden="true">
        {icon}
      </span>
      {children}
    </div>
  );
}
