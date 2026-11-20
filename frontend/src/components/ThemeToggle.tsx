import { Moon } from "lucide-react";
import { ToggleButton, Tooltip, TooltipTrigger } from "react-aria-components";
import { useTheme } from "../lib/theme";
import styles from "./IconButton.module.css";

/**
 * Switches between light and dark mode, and remembers the choice (spec 4.1).
 * It looks like the other icon buttons. The moon fills in when dark mode is on.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  return (
    <TooltipTrigger delay={500} closeDelay={150}>
      <ToggleButton
        aria-label="Dark mode"
        isSelected={dark}
        onChange={(selected) => setTheme(selected ? "dark" : "light")}
        className={styles.button}
      >
        <Moon size={18} aria-hidden="true" fill={dark ? "currentColor" : "none"} />
      </ToggleButton>
      <Tooltip className={styles.tooltip} offset={6}>
        Dark mode
      </Tooltip>
    </TooltipTrigger>
  );
}
