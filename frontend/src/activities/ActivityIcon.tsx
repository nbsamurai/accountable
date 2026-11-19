import { ArrowRight, Mail, NotebookPen, Phone } from "lucide-react";
import type { ActivityType } from "./queries";
import styles from "./Timeline.module.css";

const activities = {
  note: { label: "Note", Icon: NotebookPen },
  call: { label: "Call", Icon: Phone },
  email: { label: "Email", Icon: Mail },
  stage_change: { label: "Stage change", Icon: ArrowRight },
};

export function activityLabel(type: ActivityType) {
  return activities[type].label;
}

export function ActivityIcon({ type, circle = false }: { type: ActivityType; circle?: boolean }) {
  const { Icon } = activities[type];
  return circle
    ? <span className={styles.icon} data-type={type} aria-hidden="true"><Icon size={16} /></span>
    : <Icon size={16} aria-hidden="true" />;
}
