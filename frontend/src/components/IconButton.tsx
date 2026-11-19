import type { ReactNode } from "react";
import { Button, type ButtonProps, Tooltip, TooltipTrigger } from "react-aria-components";
import styles from "./IconButton.module.css";

type Props = Omit<ButtonProps, "children" | "aria-label" | "className"> & {
  /** The visible label in the tooltip, and the button's accessible name. */
  label: string;
  icon: ReactNode;
  className?: string;
};

/** A Midnight icon with a grey background on hover, and its label in a tooltip. */
export function IconButton({ label, icon, className, ...props }: Props) {
  return (
    <TooltipTrigger delay={500} closeDelay={150}>
      <Button {...props} aria-label={label} className={[styles.button, className].filter(Boolean).join(" ")}>
        {icon}
      </Button>
      <Tooltip className={styles.tooltip} offset={6}>
        {label}
      </Tooltip>
    </TooltipTrigger>
  );
}
