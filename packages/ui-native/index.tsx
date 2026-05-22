import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  fontSize,
  fontWeight,
  lightTheme,
  primitive,
  radius,
  spacing,
  status,
} from "@pest-patrol/ui-tokens";

export type ButtonVariant = "danger" | "ghost" | "primary" | "subtle";
export type ButtonSize = "lg" | "md" | "sm";

export interface ButtonProps {
  children: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}

export type CardPadding = "lg" | "md" | "none" | "sm";
export type CardTone = "subtle" | "surface";

export interface CardProps {
  children: ReactNode;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}

export type CaptureButtonVariant = "primary" | "secondary" | "warning";

export interface CaptureButtonProps {
  children: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: CaptureButtonVariant;
}

export type CaptureCardTone = "surface" | "warning";

export interface CaptureCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CaptureCardTone;
}

export interface CaptureSectionProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export type EyebrowTone = "accent" | "danger" | "inverse" | "muted";

export interface EyebrowProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: EyebrowTone;
}

export type StatusPillTone =
  | "danger"
  | "info"
  | "neutral"
  | "success"
  | "warning";

export interface StatusPillProps {
  children: ReactNode;
  dot?: boolean;
  tone?: StatusPillTone;
}

export type SyncBadgeTone = StatusPillTone;

export interface SyncBadgeProps {
  children: ReactNode;
  count?: number;
  dot?: boolean;
  tone?: SyncBadgeTone;
}

export type StatTileTone = StatusPillTone;

export interface StatTileProps {
  detail?: string;
  label: string;
  tone?: StatTileTone;
  value: number | string;
}

export type AvatarSize = "lg" | "md" | "sm";

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
}

const transparent = "transparent";

const buttonSizeStyles: Record<ButtonSize, ViewStyle> = {
  lg: {
    minHeight: 48,
    paddingHorizontal: spacing[5],
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
  },
  sm: {
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
};

const buttonTextSizeStyles: Record<ButtonSize, TextStyle> = {
  lg: {
    fontSize: fontSize.base,
  },
  md: {
    fontSize: fontSize.sm,
  },
  sm: {
    fontSize: fontSize.xs,
  },
};

const buttonVariantStyles: Record<
  ButtonVariant,
  { pressed: ViewStyle; root: ViewStyle; text: TextStyle }
> = {
  danger: {
    pressed: {
      opacity: 0.88,
    },
    root: {
      backgroundColor: lightTheme.action.danger,
      borderColor: transparent,
    },
    text: {
      color: lightTheme.text.inverse,
    },
  },
  ghost: {
    pressed: {
      backgroundColor: lightTheme.background.subtle,
    },
    root: {
      backgroundColor: transparent,
      borderColor: lightTheme.border.default,
    },
    text: {
      color: lightTheme.text.primary,
    },
  },
  primary: {
    pressed: {
      opacity: 0.88,
    },
    root: {
      backgroundColor: lightTheme.background.inverse,
      borderColor: transparent,
    },
    text: {
      color: lightTheme.text.inverse,
    },
  },
  subtle: {
    pressed: {
      backgroundColor: lightTheme.background.surface,
    },
    root: {
      backgroundColor: lightTheme.background.subtle,
      borderColor: lightTheme.border.subtle,
    },
    text: {
      color: lightTheme.text.primary,
    },
  },
};

const cardPaddingStyles: Record<CardPadding, ViewStyle> = {
  lg: {
    padding: spacing[4],
  },
  md: {
    padding: spacing[3],
  },
  none: {
    padding: 0,
  },
  sm: {
    padding: spacing[2],
  },
};

const cardToneStyles: Record<CardTone, ViewStyle> = {
  subtle: {
    backgroundColor: lightTheme.background.subtle,
  },
  surface: {
    backgroundColor: lightTheme.background.surface,
  },
};

const captureButtonVariantStyles: Record<
  CaptureButtonVariant,
  { pressed: ViewStyle; root: ViewStyle; text: TextStyle }
> = {
  primary: {
    pressed: {
      opacity: 0.88,
    },
    root: {
      backgroundColor: lightTheme.background.inverse,
      borderColor: transparent,
    },
    text: {
      color: lightTheme.text.inverse,
    },
  },
  secondary: {
    pressed: {
      backgroundColor: lightTheme.background.subtle,
    },
    root: {
      backgroundColor: lightTheme.background.surface,
      borderColor: lightTheme.border.strong,
    },
    text: {
      color: lightTheme.text.primary,
    },
  },
  warning: {
    pressed: {
      opacity: 0.88,
    },
    root: {
      backgroundColor: lightTheme.background.inverse,
      borderColor: transparent,
    },
    text: {
      color: lightTheme.text.inverse,
    },
  },
};

const captureCardToneStyles: Record<CaptureCardTone, ViewStyle> = {
  surface: {
    backgroundColor: lightTheme.background.surface,
    borderColor: lightTheme.border.subtle,
  },
  warning: {
    backgroundColor: status.alert.warning.bg,
    borderColor: status.alert.warning.border,
  },
};

const eyebrowToneStyles: Record<EyebrowTone, TextStyle> = {
  accent: {
    color: lightTheme.status.enRoute,
  },
  danger: {
    color: status.sync.failed.solid,
  },
  inverse: {
    color: lightTheme.text.inverse,
  },
  muted: {
    color: lightTheme.text.muted,
  },
};

const statusPillToneStyles: Record<
  StatusPillTone,
  { dot: ViewStyle; root: ViewStyle; text: TextStyle; value: TextStyle }
> = {
  danger: {
    dot: {
      backgroundColor: status.sync.failed.solid,
    },
    root: {
      backgroundColor: status.alert.danger.bg,
      borderColor: status.alert.danger.border,
    },
    text: {
      color: status.alert.danger.fgStrong,
    },
    value: {
      color: status.sync.failed.solid,
    },
  },
  info: {
    dot: {
      backgroundColor: lightTheme.status.enRoute,
    },
    root: {
      backgroundColor: status.alert.info.bg,
      borderColor: status.alert.info.border,
    },
    text: {
      color: status.alert.info.fgStrong,
    },
    value: {
      color: status.alert.info.solid,
    },
  },
  neutral: {
    dot: {
      backgroundColor: status.alert.neutral.solid,
    },
    root: {
      backgroundColor: status.alert.neutral.bg,
      borderColor: status.alert.neutral.border,
    },
    text: {
      color: status.alert.neutral.fgStrong,
    },
    value: {
      color: lightTheme.text.primary,
    },
  },
  success: {
    dot: {
      backgroundColor: status.sync.synced.solid,
    },
    root: {
      backgroundColor: status.alert.success.bg,
      borderColor: status.alert.success.border,
    },
    text: {
      color: status.alert.success.fgStrong,
    },
    value: {
      color: status.sync.synced.solid,
    },
  },
  warning: {
    dot: {
      backgroundColor: status.sync.retrying.solid,
    },
    root: {
      backgroundColor: status.alert.warning.bg,
      borderColor: status.alert.warning.border,
    },
    text: {
      color: status.alert.warning.fgStrong,
    },
    value: {
      color: status.sync.retrying.solid,
    },
  },
};

const avatarSizes: Record<
  AvatarSize,
  { root: ViewStyle; text: TextStyle }
> = {
  lg: {
    root: {
      height: 40,
      width: 40,
    },
    text: {
      fontSize: fontSize.base,
    },
  },
  md: {
    root: {
      height: 32,
      width: 32,
    },
    text: {
      fontSize: fontSize.sm,
    },
  },
  sm: {
    root: {
      height: 24,
      width: 24,
    },
    text: {
      fontSize: fontSize.xs,
    },
  },
};

const avatarPalette = [
  {
    backgroundColor: primitive.sky[200],
    color: primitive.sky[600],
  },
  {
    backgroundColor: primitive.slate[200],
    color: primitive.navy[800],
  },
  {
    backgroundColor: primitive.green[200],
    color: primitive.green[600],
  },
  {
    backgroundColor: primitive.yellow[200],
    color: primitive.slate[700],
  },
  {
    backgroundColor: primitive.red[200],
    color: primitive.red[600],
  },
] as const;

function avatarIndex(name: string) {
  const hash = [...name].reduce(
    (current, character) => (current * 31 + character.charCodeAt(0)) | 0,
    0,
  );

  return Math.abs(hash) % avatarPalette.length;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function Button({
  children,
  disabled = false,
  fullWidth = false,
  onPress,
  size = "md",
  style,
  variant = "primary",
}: ButtonProps) {
  const variantStyles = buttonVariantStyles[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      pointerEvents={disabled ? "none" : "auto"}
      style={({ pressed }) => [
        styles.button,
        buttonSizeStyles[size],
        variantStyles.root,
        fullWidth ? styles.fullWidth : styles.contentWidth,
        pressed ? variantStyles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          buttonTextSizeStyles[size],
          variantStyles.text,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  padding = "md",
  style,
  tone = "surface",
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        cardPaddingStyles[padding],
        cardToneStyles[tone],
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CaptureSection({ children, style }: CaptureSectionProps) {
  return <View style={[styles.captureSection, style]}>{children}</View>;
}

export function CaptureCard({
  children,
  style,
  tone = "surface",
}: CaptureCardProps) {
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <Text style={styles.captureCardText}>{children}</Text>
    ) : (
      children
    );

  return (
    <View style={[styles.captureCard, captureCardToneStyles[tone], style]}>
      {content}
    </View>
  );
}

export function CaptureButton({
  children,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
  variant = "primary",
}: CaptureButtonProps) {
  const variantStyles = captureButtonVariantStyles[variant];
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <Text style={[styles.captureButtonText, variantStyles.text]}>
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      pointerEvents={disabled ? "none" : "auto"}
      style={({ pressed }) => [
        styles.captureButton,
        variantStyles.root,
        fullWidth ? styles.fullWidth : styles.contentWidth,
        pressed ? variantStyles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Eyebrow({
  children,
  style,
  tone = "accent",
}: EyebrowProps) {
  return (
    <Text style={[styles.eyebrow, eyebrowToneStyles[tone], style]}>
      {children}
    </Text>
  );
}

export function StatusPill({
  children,
  dot = true,
  tone = "neutral",
}: StatusPillProps) {
  const toneStyles = statusPillToneStyles[tone];

  return (
    <View style={[styles.statusPill, toneStyles.root]}>
      {dot ? <View style={[styles.statusDot, toneStyles.dot]} /> : null}
      <Text style={[styles.statusText, toneStyles.text]}>{children}</Text>
    </View>
  );
}

export function SyncBadge({
  children,
  count,
  dot = true,
  tone = "neutral",
}: SyncBadgeProps) {
  const toneStyles = statusPillToneStyles[tone];

  return (
    <View style={[styles.syncBadge, toneStyles.root]}>
      {dot ? <View style={[styles.statusDot, toneStyles.dot]} /> : null}
      <Text style={[styles.statusText, toneStyles.text]}>{children}</Text>
      {count !== undefined ? (
        <Text style={[styles.syncBadgeCount, toneStyles.text]}>{count}</Text>
      ) : null}
    </View>
  );
}

export function StatTile({
  detail,
  label,
  tone = "neutral",
  value,
}: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, statusPillToneStyles[tone].value]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const palette = avatarPalette[avatarIndex(name)];

  return (
    <View style={[styles.avatar, avatarSizes[size].root, palette]}>
      <Text style={[styles.avatarText, avatarSizes[size].text, palette]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: fontWeight.bold,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: fontWeight.bold,
  },
  card: {
    borderColor: lightTheme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  captureButton: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  captureButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  captureCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  captureCardText: {
    color: lightTheme.text.secondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  captureSection: {
    borderColor: lightTheme.border.subtle,
    borderTopWidth: 1,
    gap: spacing[3],
    marginTop: spacing[3],
    paddingTop: spacing[3],
  },
  contentWidth: {
    alignSelf: "flex-start",
  },
  disabled: {
    opacity: 0.5,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  statDetail: {
    color: lightTheme.text.secondary,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  statLabel: {
    color: lightTheme.text.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
  },
  statTile: {
    backgroundColor: lightTheme.background.surface,
    borderColor: lightTheme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  statValue: {
    fontSize: fontSize["2xl"],
    fontVariant: ["tabular-nums"],
    fontWeight: fontWeight.extrabold,
  },
  statusDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  syncBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  syncBadgeCount: {
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
    fontWeight: fontWeight.extrabold,
  },
});
