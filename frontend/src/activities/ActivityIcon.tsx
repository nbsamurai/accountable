import { ArrowRight, File, Mail, Phone } from "lucide-react";
import type { ActivityType } from "./queries";
import styles from "./Timeline.module.css";

const activities = {
  note: { label: "Note", Icon: File },
  call: { label: "Call", Icon: Phone },
  email: { label: "Email", Icon: Mail },
  stage_change: { label: "Stage change", Icon: ArrowRight },
};

export function activityLabel(type: ActivityType) {
  return activities[type].label;
}

export function ActivityIcon({ type, circle = false, compact = false }: { type: ActivityType; circle?: boolean; compact?: boolean }) {
  const { Icon } = activities[type];
  return circle
    ? <span className={styles.icon} data-type={type} data-compact={compact || undefined} aria-hidden="true"><Icon size={compact ? 14 : 16} /></span>
    : <Icon size={16} aria-hidden="true" />;
}
