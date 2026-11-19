import styles from "./Skeleton.module.css";

type Props = { width?: string | number; height?: string | number; className?: string };

/** A grey block in the shape of the content that's loading. Never a spinner on its own. */
export function Skeleton({ width = "100%", height = 16, className }: Props) {
  return (
    <span
      className={[styles.block, className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Several lines of grey blocks, with "Loading" for screen readers. */
export function SkeletonLines({ lines = 3, label = "Loading" }: { lines?: number; label?: string }) {
  return (
    <div className={styles.lines} role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={`${90 - ((i * 17) % 40)}%`} />
      ))}
    </div>
  );
}
