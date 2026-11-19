import { useDroppable } from "@dnd-kit/react";
import { Plus } from "lucide-react";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { StagePill } from "../components/Pill";
import { money, number } from "../lib/format";
import { stage, type Stage } from "../lib/stages";
import { Card, type CardActions } from "./Card";
import type { ColumnData, Drop } from "./queries";
import styles from "./Board.module.css";

export function Column({ column, today, drop, activeId, visible, showMore, actions, onAdd }: {
  column: ColumnData;
  today: string;
  drop?: Drop;
  activeId?: number;
  visible: number;
  showMore: () => void;
  actions: CardActions;
  onAdd: (stage: Stage) => void;
}) {
  const { ref } = useDroppable({ id: column.stage });
  const info = stage(column.stage);
  const cards = column.cards.slice(0, visible);
  const hidden = column.count - cards.length;
  const end = drop && (drop.before_id === null || !cards.some((card) => card.id === drop.before_id));
  return (
    <section className={styles.column} ref={ref} data-column={column.stage} aria-label={info.name}>
      <header className={styles.columnHead}>
        <div className={styles.columnTitle}>
          <h2><StagePill value={column.stage} count={column.count} /></h2>
          <IconButton label={`Add deal to ${info.name}`} icon={<Plus size={18} aria-hidden="true" />} onPress={() => onAdd(column.stage)} />
        </div>
        <div className={styles.columnFigures}>
          <span className="mono">{money(column.value)}</span>
          <span>Expected <span className="mono">{money(column.expected_revenue)}</span></span>
        </div>
        {!info.open && <p className={styles.closedNote}>Closed in the last 30 days</p>}
      </header>
      <ol className={styles.cards} data-drop-end={end || undefined}>
        {cards.map((card) => (
          <Card key={card.id} deal={card} today={today} dropBefore={drop?.before_id === card.id} active={activeId === card.id} actions={actions} />
        ))}
      </ol>
      {hidden > 0 && <Button className={styles.moreCards} onPress={showMore}>Show {number(hidden)} more</Button>}
    </section>
  );
}
