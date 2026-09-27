// components/Icon.tsx
/**
 * Material Symbols wrapper: real icon glyphs instead of unicode
 * arrows/emoji or custom SVGs for UI controls. Inherits color via
 * currentColor automatically (no color prop needed).
 */

export default function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
      }}
    >
      {name}
    </span>
  );
}
