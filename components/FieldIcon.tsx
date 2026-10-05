export default function FieldIcon({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="field-icon">
      <span className="field-icon__mark" aria-hidden="true">
        {icon}
      </span>
      {children}
    </div>
  );
}
