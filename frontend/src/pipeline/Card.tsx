import { useDraggable } from "@dnd-kit/react";
import { Calendar, GripVertical } from "lucide-react";
import { Link } from "react-router";
import { LateBadge } from "../components/LateBadge";
import { dateNear, EMPTY, initials, money, percent } from "../lib/format";
import type { Stage } from "../lib/stages";
import { CardMenu } from "./CardMenu";
import type { CardDeal } from "./queries";
import styles from "./Board.module.css";

export type CardActions = {
  moveTo: (deal: CardDeal, stage: Stage) => void;
  reorder: (deal: CardDeal, direction: -1 | 1) => void;
  atBoundary: (deal: CardDeal, direction: -1 | 1) => boolean;
  open: (deal: CardDeal) => void;
  edit: (deal: CardDeal) => void;
};

export function Card({ deal, today, dropBefore, active, actions }: {
  deal: CardDeal;
  today: string;
  dropBefore: boolean;
  active: boolean;
  actions: CardActions;
}) {
  const { ref, handleRef } = useDraggable({ id: deal.id });
  return (
    <li className={styles.card} ref={ref} data-deal={deal.id} data-drop-before={dropBefore || undefined} data-drag-active={active || undefined}>
      <div className={styles.cardTop}>
        <button type="button" ref={handleRef} className={styles.grip} data-grip aria-label={`Move ${deal.name}`} aria-describedby="pipeline-drag-help">
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <Link className={styles.cardName} to={`/deals/${deal.id}`}>{deal.name}</Link>
        <CardMenu deal={deal} actions={actions} />
      </div>
      <div className={styles.cardBody}>
        {deal.organization && <p className={styles.organization}>{deal.organization.name}</p>}
        <div className={styles.cardValue}>
          <span className="mono">{money(deal.value)}</span>
          {deal.contact && (
            <span className={styles.avatar} role="img" aria-label={`Main contact: ${deal.contact.name}`} title={deal.contact.name}>
              {initials(deal.contact.name)}
            </span>
          )}
        </div>
        <div className={styles.meter}>
          <span className={styles.meterTrack} aria-hidden="true"><span style={{ width: percent(deal.probability) }} /></span>
          <span className="mono">{percent(deal.probability)}</span>
        </div>
        <p className={styles.cardDate}>
          {deal.late ? <LateBadge /> : <Calendar size={14} aria-hidden="true" />}
          {deal.close_date ? <time dateTime={deal.close_date}>{dateNear(deal.close_date, today)}</time> : <span aria-label="No close date">{EMPTY}</span>}
        </p>
      </div>
    </li>
  );
}
