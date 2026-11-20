import type { ReactNode } from "react";
import styles from "./Panel.module.css";

type Props = {
  title?: ReactNode;
  /** The id of the title, so the panel can be a labelled region. */
  titleId?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "section" | "div";
  "aria-label"?: string;
};

/** A white panel with 16 px corners, 24 px padding and its title at top left. */
export function Panel({ title, titleId, actions, children, className, as = "section", ...rest }: Props) {
  const Tag = as;
  const labelled = title && titleId ? { "aria-labelledby": titleId } : {};
  return (
    <Tag className={[styles.panel, className].filter(Boolean).join(" ")} {...labelled} {...rest}>
      {(title || actions) && (
        <div className={styles.head}>
          {title && (
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
