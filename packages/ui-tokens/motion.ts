export const duration = {
  instant: 0,
  fast: 120,
  base: 200,
  slow: 320,
  slower: 500,
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  enter: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const motion = {
  duration,
  easing,
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
