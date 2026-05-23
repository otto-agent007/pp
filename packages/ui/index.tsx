import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type * as React from "react";

type ClassValue = false | null | string | undefined;

function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonVariant =
  | "danger"
  | "ghost"
  | "inverse"
  | "navy"
  | "primary"
  | "subtle"
  | "text";
export type ButtonSize = "lg" | "md" | "sm";

const buttonSizeClasses: Record<ButtonSize, string> = {
  lg: "min-h-12 px-5 text-base",
  md: "min-h-10 px-4 text-sm",
  sm: "min-h-8 px-3 text-[13px]",
};

const buttonVariantClasses: Record<ButtonVariant, string> = {
  danger:
    "border-transparent bg-theme-action-danger text-theme-text-inverse hover:bg-primitive-red-600",
  ghost:
    "border-theme-border-default bg-transparent text-theme-text-primary hover:bg-theme-background-subtle",
  inverse:
    "border-theme-text-inverse/20 bg-transparent text-theme-text-inverse hover:bg-theme-background-surface/10 hover:text-theme-text-inverse",
  navy: "border-transparent bg-theme-background-inverse text-theme-text-inverse hover:bg-primitive-navy-800",
  primary:
    "border-transparent bg-theme-action-primary text-theme-text-inverse hover:bg-theme-action-primaryStrong",
  subtle:
    "border-theme-border-subtle bg-theme-background-subtle text-theme-text-primary hover:bg-theme-background-surface",
  text: "border-transparent bg-transparent text-theme-text-secondary hover:bg-theme-background-subtle hover:text-theme-text-primary",
};

export function buttonClassName({
  className,
  fullWidth = false,
  size = "md",
  variant = "primary",
}: {
  className?: string;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-md border font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    fullWidth && "w-full",
    buttonSizeClasses[size],
    buttonVariantClasses[variant],
    className,
  );
}

export const formLabelClassName =
  "flex flex-col gap-1 text-sm font-medium text-theme-text-primary";

export const formControlClassName =
  "min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm font-normal text-theme-text-primary outline-none transition focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

export const formTextareaClassName = cx(formControlClassName, "min-h-24 py-2");

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  size?: ButtonSize;
  trailingIcon?: React.ReactNode;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  fullWidth,
  leadingIcon,
  size,
  trailingIcon,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ className, fullWidth, size, variant })}
      type={type}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export interface SearchableSelectOption {
  disabled?: boolean;
  keywords?: string[];
  label: string;
  value: string;
}

export type SearchableSelectSize = "md" | "sm";

export interface SearchableSelectProps {
  ariaLabel: string;
  disabled?: boolean;
  emptyMessage?: string;
  label: React.ReactNode;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  size?: SearchableSelectSize;
  value: string;
}

const searchableSelectSizeClasses: Record<
  SearchableSelectSize,
  { input: string; list: string; option: string; root: string }
> = {
  md: {
    input: "min-h-11 px-3 text-sm",
    list: "text-sm",
    option: "px-3 py-2",
    root: "text-sm",
  },
  sm: {
    input: "min-h-9 px-2 text-xs",
    list: "text-xs",
    option: "px-2 py-1.5",
    root: "text-xs",
  },
};

function optionSearchText(option: SearchableSelectOption) {
  return [option.label, ...(option.keywords ?? [])].join(" ").toLowerCase();
}

function firstEnabledIndex(options: SearchableSelectOption[]) {
  return options.findIndex((option) => !option.disabled);
}

function nextEnabledIndex(
  options: SearchableSelectOption[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) {
    return -1;
  }

  for (let offset = 1; offset <= options.length; offset += 1) {
    const nextIndex =
      (currentIndex + direction * offset + options.length) % options.length;

    if (!options[nextIndex].disabled) {
      return nextIndex;
    }
  }

  return -1;
}

export function SearchableSelect({
  ariaLabel,
  disabled = false,
  emptyMessage = "No options found",
  label,
  onChange,
  options,
  size = "md",
  value,
}: SearchableSelectProps) {
  const inputId = useId();
  const listboxId = useId();
  const activeOptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const sizeClasses = searchableSelectSizeClasses[size];
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      optionSearchText(option).includes(normalizedQuery),
    );
  }, [options, query]);
  const [activeIndex, setActiveIndex] = useState(() =>
    firstEnabledIndex(filteredOptions),
  );
  const activeOption = filteredOptions[activeIndex];

  useEffect(() => {
    setActiveIndex(firstEnabledIndex(filteredOptions));
  }, [filteredOptions]);

  function closeList() {
    setIsOpen(false);
    setQuery("");
  }

  function selectOption(option: SearchableSelectOption) {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
    closeList();
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        nextEnabledIndex(filteredOptions, current, 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        nextEnabledIndex(filteredOptions, current, -1),
      );
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      event.preventDefault();

      if (activeOption) {
        selectOption(activeOption);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
    }
  }

  return (
    <div
      className={cx(
        "relative flex min-w-0 flex-col gap-1 font-medium text-theme-text-primary",
        sizeClasses.root,
      )}
    >
      <label htmlFor={inputId}>{label}</label>
      <input
        aria-activedescendant={
          isOpen && activeOption
            ? `${activeOptionId}-${activeIndex}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={cx(
          "w-full rounded-md border border-theme-border-default bg-theme-background-surface text-theme-text-primary outline-none transition focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
          sizeClasses.input,
        )}
        disabled={disabled}
        id={inputId}
        onBlur={closeList}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onClick={() => {
          setQuery("");
          setIsOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        role="combobox"
        value={isOpen ? query : (selectedOption?.label ?? "")}
      />
      {isOpen && !disabled ? (
        <div
          className={cx(
            "absolute top-full z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-theme-border-default bg-theme-background-surface py-1 shadow-lg",
            sizeClasses.list,
          )}
          id={listboxId}
          role="listbox"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isActive = index === activeIndex;
              const isSelected = option.value === value;

              return (
                <button
                  aria-disabled={option.disabled ? "true" : undefined}
                  aria-selected={isSelected}
                  className={cx(
                    "flex w-full items-center text-left font-medium outline-none transition",
                    sizeClasses.option,
                    isActive &&
                      "bg-theme-background-subtle text-theme-text-primary",
                    !isActive && "text-theme-text-secondary",
                    isSelected && "font-bold text-theme-text-primary",
                    option.disabled &&
                      "cursor-not-allowed text-theme-text-muted opacity-60",
                  )}
                  disabled={option.disabled}
                  id={`${activeOptionId}-${index}`}
                  key={`${option.value}-${option.label}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                  role="option"
                  type="button"
                >
                  {option.label}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-theme-text-muted" role="status">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export type CardPadding = "lg" | "md" | "none" | "sm";
export type CardTone = "subtle" | "surface";

const cardPaddingClasses: Record<CardPadding, string> = {
  lg: "p-5",
  md: "p-4",
  none: "p-0",
  sm: "p-3",
};

const cardToneClasses: Record<CardTone, string> = {
  subtle: "border-theme-border-subtle bg-theme-background-subtle",
  surface: "border-theme-border-subtle bg-theme-background-surface",
};

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
  tone?: CardTone;
};

export function Card({
  children,
  className,
  padding = "md",
  tone = "surface",
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        "rounded-lg border shadow-sm",
        cardPaddingClasses[padding],
        cardToneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type EyebrowTone = "accent" | "danger" | "inverse" | "muted";

const eyebrowToneClasses: Record<EyebrowTone, string> = {
  accent: "text-primitive-sky-500",
  danger: "text-primitive-red-500",
  inverse: "text-primitive-yellow-400",
  muted: "text-theme-text-muted",
};

export type EyebrowProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: EyebrowTone;
};

export function Eyebrow({
  children,
  className,
  tone = "muted",
  ...props
}: EyebrowProps) {
  return (
    <div
      className={cx(
        "text-xs font-extrabold uppercase tracking-wide",
        eyebrowToneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type StatusPillTone =
  | "danger"
  | "info"
  | "neutral"
  | "success"
  | "warning";

const statusPillToneClasses: Record<
  StatusPillTone,
  { dot: string; root: string }
> = {
  danger: {
    dot: "bg-status-alert-danger-solid",
    root: "border-status-alert-danger-border bg-status-alert-danger-bg text-status-alert-danger-fg",
  },
  info: {
    dot: "bg-status-alert-info-solid",
    root: "border-status-alert-info-border bg-status-alert-info-bg text-status-alert-info-fg",
  },
  neutral: {
    dot: "bg-status-alert-neutral-solid",
    root: "border-status-alert-neutral-border bg-status-alert-neutral-bg text-status-alert-neutral-fg",
  },
  success: {
    dot: "bg-status-alert-success-solid",
    root: "border-status-alert-success-border bg-status-alert-success-bg text-status-alert-success-fg",
  },
  warning: {
    dot: "bg-status-alert-warning-solid",
    root: "border-status-alert-warning-border bg-status-alert-warning-bg text-status-alert-warning-fg",
  },
};

export type StatusPillProps = React.HTMLAttributes<HTMLSpanElement> & {
  dot?: boolean;
  tone?: StatusPillTone;
};

export function StatusPill({
  children,
  className,
  dot = true,
  tone = "neutral",
  ...props
}: StatusPillProps) {
  const toneClasses = statusPillToneClasses[tone];

  return (
    <span
      className={cx(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
        toneClasses.root,
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cx("h-1.5 w-1.5 rounded-full", toneClasses.dot)}
        />
      ) : null}
      {children}
    </span>
  );
}

export type StatTileProps = React.HTMLAttributes<HTMLDivElement> & {
  detail?: React.ReactNode;
  label: React.ReactNode;
  tone?: StatusPillTone;
  value: React.ReactNode;
};

const statDetailToneClasses: Record<StatusPillTone, string> = {
  danger: "text-status-alert-danger-fg",
  info: "text-status-alert-info-fgStrong",
  neutral: "text-theme-text-secondary",
  success: "text-status-alert-success-fg",
  warning: "text-status-alert-warning-fg",
};

const statTileToneClasses: Record<StatusPillTone, string> = {
  danger: "border-status-alert-danger-border bg-status-alert-danger-bg",
  info: "border-status-alert-info-border bg-status-alert-info-bg",
  neutral: "border-theme-border-subtle bg-theme-background-surface",
  success: "border-status-alert-success-border bg-status-alert-success-bg",
  warning: "border-status-alert-warning-border bg-status-alert-warning-bg",
};

export function StatTile({
  className,
  detail,
  label,
  tone = "neutral",
  value,
  ...props
}: StatTileProps) {
  return (
    <Card className={cx(statTileToneClasses[tone], className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>{label}</Eyebrow>
        <span
          aria-hidden="true"
          className={cx(
            "mt-1 h-2.5 w-2.5 rounded-full",
            statusPillToneClasses[tone].dot,
          )}
        />
      </div>
      <div className="mt-3 text-3xl font-extrabold tabular-nums text-theme-text-primary">
        {value}
      </div>
      {detail ? (
        <div
          className={cx("mt-1 text-sm font-bold", statDetailToneClasses[tone])}
        >
          {detail}
        </div>
      ) : null}
    </Card>
  );
}

export type CountTileProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  active?: boolean;
  count: React.ReactNode;
  label: React.ReactNode;
  tone?: StatusPillTone;
};

export function CountTile({
  active = false,
  className,
  count,
  disabled,
  label,
  tone = "neutral",
  type = "button",
  ...props
}: CountTileProps) {
  return (
    <button
      aria-pressed={active}
      className={cx(
        "rounded-lg border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        statTileToneClasses[tone],
        active && "ring-2 ring-theme-action-primary ring-offset-1",
        !disabled && "hover:border-theme-action-primary",
        className,
      )}
      disabled={disabled}
      type={type}
      {...props}
    >
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-2 text-2xl font-bold tabular-nums text-theme-text-primary">
        {count}
      </div>
    </button>
  );
}

export type AvatarSize = "lg" | "md" | "sm";

const avatarSizeClasses: Record<AvatarSize, string> = {
  lg: "h-11 w-11 text-base",
  md: "h-8 w-8 text-xs",
  sm: "h-7 w-7 text-[11px]",
};

const avatarPaletteClasses = [
  "bg-primitive-sky-600",
  "bg-status-alert-success-solid",
  "bg-primitive-navy-800",
  "bg-status-alert-danger-solid",
  "bg-status-alert-warning-solid text-primitive-navy-950",
] as const;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  size?: AvatarSize;
};

export function Avatar({
  className,
  name,
  size = "md",
  ...props
}: AvatarProps) {
  const trimmedName = name.trim() || "Unknown";
  const paletteIndex = trimmedName.length % avatarPaletteClasses.length;

  return (
    <div
      aria-label={trimmedName}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-theme-text-inverse",
        avatarSizeClasses[size],
        avatarPaletteClasses[paletteIndex],
        className,
      )}
      role="img"
      {...props}
    >
      {getInitials(trimmedName)}
    </div>
  );
}
