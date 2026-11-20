import type { ReactNode } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "quiet";

type Props = Omit<AriaButtonProps, "className" | "children"> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Primary is Sea Green with Midnight text, secondary is grey, and destructive is Raspberry ink. */
export function Button({ variant = "secondary", icon, children, className, ...props }: Props) {
  return (
    <AriaButton {...props} className={[styles.button, styles[variant], className].filter(Boolean).join(" ")}>
      {icon}
      {children}
    </AriaButton>
  );
}
