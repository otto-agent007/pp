import type { ReactElement, ReactNode } from "react";

export interface TestElementProps {
  autoClear?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  source?: unknown;
  style?: unknown;
  variant?: string;
}

export type TestElement = ReactElement<TestElementProps>;
