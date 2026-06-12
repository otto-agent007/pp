import { Logomark } from "./logomark";
import { Wordmark, type WordmarkVariant } from "./wordmark";
import { useActiveBrandSkin } from "./active-brand";

interface BrandWordmarkProps {
  className?: string;
  label?: string | "decorative";
  variant?: WordmarkVariant;
  width?: number;
}

interface BrandLogomarkProps {
  className?: string;
  label?: string | "decorative";
  size?: number;
}

function fallbackInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function BrandWordmark({
  className,
  label,
  variant = "light",
  width = 280,
}: BrandWordmarkProps) {
  const brandSkin = useActiveBrandSkin();
  const accessibleLabel = label ?? brandSkin.sidebarWordmarkLabel;

  if (brandSkin.sidebarLogoKind === "pest_patrol_static") {
    return (
      <Wordmark
        className={className}
        label={accessibleLabel}
        variant={variant}
        width={width}
      />
    );
  }

  const decorative = accessibleLabel === "decorative";

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      className={[
        "inline-flex items-center gap-2 leading-none",
        variant === "dark" ? "text-[var(--pp-sidebar-text)]" : "text-theme-text-primary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="brand-wordmark-text-fallback"
      role={decorative ? undefined : "img"}
      style={{ width }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--pp-sidebar-border)] bg-[var(--pp-sidebar-active-bg)] text-xs font-extrabold text-[var(--pp-sidebar-active-text)]">
        {fallbackInitials(brandSkin.companyName)}
      </span>
      <span className="min-w-0 truncate text-sm font-extrabold uppercase tracking-wide">
        {brandSkin.shortName}
      </span>
    </span>
  );
}

export function BrandLogomark({
  className,
  label,
  size = 140,
}: BrandLogomarkProps) {
  const brandSkin = useActiveBrandSkin();
  const accessibleLabel = label ?? brandSkin.logoAlt;

  if (brandSkin.sidebarLogoKind === "pest_patrol_static") {
    return <Logomark className={className} label={accessibleLabel} size={size} />;
  }

  const decorative = accessibleLabel === "decorative";

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      className={[
        "inline-flex items-center justify-center rounded-md border border-[var(--pp-sidebar-border)] bg-[var(--pp-sidebar-active-bg)] font-extrabold text-[var(--pp-sidebar-active-text)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="brand-logomark-text-fallback"
      role={decorative ? undefined : "img"}
      style={{ height: size, width: size }}
    >
      {fallbackInitials(brandSkin.companyName)}
    </span>
  );
}
