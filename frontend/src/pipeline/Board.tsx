import { Accessibility, Feedback } from "@dnd-kit/dom";
import {
  DragDropProvider,
  KeyboardSensor,
  PointerSensor,
  type DragDropManager,
} from "@dnd-kit/react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useNavigate } from "react-router";
import type { Stage } from "../lib/stages";
import { announce } from "./announcements";
import { dropPosition, firstDrop, INITIAL_CARDS, keyboardDrop } from "./boardState";
import { Column } from "./Column";
import type { BoardData, CardDeal, Drop } from "./queries";
import styles from "./Board.module.css";

class BoardKeyboardSensor extends KeyboardSensor {
  constructor(manager: DragDropManager) {
    super(manager, {
      keyboardCodes: {
        ...KeyboardSensor.defaults.keyboardCodes,
        end: ["Space", "Enter"],
        cancel: ["Escape", "Tab"],
      },
    });
  }

  // The board advances one insertion slot per key, including in empty columns.
  protected override handleMove(
    _direction: "up" | "down" | "left" | "right",
    event: KeyboardEvent,
  ) {
    event.preventDefault();
    this.manager.actions.move({ event, by: { x: 0, y: 0 } });
  }
}

const sensors = [
  PointerSensor.configure({ activatorElements: (source) => [source.element] }),
  BoardKeyboardSensor,
];

const plugins: ComponentProps<typeof DragDropProvider>["plugins"] = (defaults) => [
  ...defaults.filter((plugin) => plugin !== Accessibility && plugin !== Feedback),
  Feedback.configure({
    feedback: (_, manager) =>
      manager.dragOperation.activatorEvent instanceof KeyboardEvent ? "none" : "clone",
    dropAnimation: null,
  }),
];

type Drag = { card: CardDeal; drop: Drop | null; keyboard: boolean };
type FocusTarget = { id: number; stage: Stage; control: "grip" | "menu" };
type Props = {
  data: BoardData;
  busy: boolean;
  onMove: (card: CardDeal, drop: Drop) => void;
  onAdd: (stage: Stage) => void;
  onEdit: (card: CardDeal) => void;
};

function sameDrop(a: Drop | null, b: Drop | null) {
  return a?.stage === b?.stage && a?.before_id === b?.before_id;
}

export function Board({ data, busy, onMove, onAdd, onEdit }: Props) {
  const navigate = useNavigate();
  const viewport = useRef<HTMLDivElement>(null);
  const currentDrag = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [limits, setLimits] = useState<Partial<Record<Stage, number>>>({});
  const [message, setMessage] = useState("");
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const visible = (stage: Stage) => limits[stage] ?? INITIAL_CARDS;
  const findColumn = (stage: Stage) => data.columns.find((column) => column.stage === stage)!;

  function updateDrag(next: Drag | null) {
    currentDrag.current = next;
    setDrag(next);
  }

  function pointerDrop(card: CardDeal, x: number, y: number): Drop | null {
    const container = viewport.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    for (const column of container.querySelectorAll<HTMLElement>("[data-column]")) {
      const bounds = column.getBoundingClientRect();
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) continue;
      const stage = column.dataset.column as Stage;
      const cards = findColumn(stage).cards;
      const nodes = Array.from(column.querySelectorAll<HTMLElement>("ol > [data-deal]"));
      const before = nodes.find((node) => {
        const box = node.getBoundingClientRect();
        return Number(node.dataset.deal) !== card.id && y < box.top + box.height / 2;
      });
      return {
        stage,
        before_id: before ? Number(before.dataset.deal) : (cards[visible(stage)]?.id ?? null),
      };
    }
    return null;
  }

  useEffect(() => {
    if (!focusTarget) return;
    const { id, stage, control } = focusTarget;
    const frame = requestAnimationFrame(() => {
      const target = viewport.current?.querySelector<HTMLElement>(
        `[data-column="${stage}"] [data-deal="${id}"] ${control === "grip" ? "[data-grip]" : "[data-card-menu]"}`,
      );
      if (target) {
        target.focus();
        setFocusTarget(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [data, focusTarget]);

  function move(card: CardDeal, drop: Drop, focus?: "grip" | "menu") {
    if (busy || sameDrop(firstDrop(data, card), drop)) return;
    const { index } = dropPosition(data, card, drop);
    if (index >= visible(drop.stage))
      setLimits((limits) => ({ ...limits, [drop.stage]: index + 1 }));
    onMove(card, drop);
    if (focus) setFocusTarget({ id: card.id, stage: drop.stage, control: focus });
  }

  const actions = {
    moveTo: (card: CardDeal, stage: Stage) =>
      move(card, { stage, before_id: findColumn(stage).cards[0]?.id ?? null }, "menu"),
    atBoundary: (card: CardDeal, direction: -1 | 1) => {
      const cards = findColumn(card.stage).cards;
      const next = cards.findIndex((item) => item.id === card.id) + direction;
      return busy || next < 0 || next >= cards.length;
    },
    reorder: (card: CardDeal, direction: -1 | 1) => {
      const cards = findColumn(card.stage).cards;
      const index = cards.findIndex((item) => item.id === card.id);
      move(
        card,
        { stage: card.stage, before_id: cards[index + (direction === -1 ? -1 : 2)]?.id ?? null },
        "menu",
      );
    },
    open: (card: CardDeal) => void navigate(`/deals/${card.id}`),
    edit: onEdit,
  };

  return (
    <DragDropProvider
      sensors={sensors}
      plugins={plugins}
      onBeforeDragStart={(event) => {
        if (busy) event.preventDefault();
      }}
      onDragStart={({ operation, nativeEvent }) => {
        const card = data.columns
          .flatMap((column) => column.cards)
          .find((item) => item.id === operation.source?.id);
        if (!card) return;
        const drop = firstDrop(data, card);
        setMessage(announce("picked", data, card, drop));
        updateDrag({ card, drop, keyboard: nativeEvent instanceof KeyboardEvent });
      }}
      onDragMove={(event) => {
        const active = currentDrag.current;
        if (!active) return;
        const { card, keyboard } = active;
        const drop =
          keyboard && event.nativeEvent instanceof KeyboardEvent
            ? keyboardDrop(
                data,
                card,
                active.drop ?? firstDrop(data, card),
                event.nativeEvent.key,
                limits,
              )
            : event.to
              ? pointerDrop(card, event.to.x, event.to.y)
              : null;
        if (keyboard) event.preventDefault();
        if (sameDrop(active.drop, drop)) return;
        updateDrag({ ...active, drop });
        if (!drop) return;
        setMessage(announce("over", data, card, drop));
        if (keyboard) scrollToDrop(viewport.current, drop);
      }}
      onDragEnd={({ canceled, nativeEvent }) => {
        const active = currentDrag.current;
        if (!active) return;
        const { card, keyboard } = active;
        const drop =
          nativeEvent instanceof PointerEvent
            ? pointerDrop(card, nativeEvent.clientX, nativeEvent.clientY)
            : active.drop;
        updateDrag(null);
        if (canceled || !drop) {
          setMessage(announce("canceled", data, card, firstDrop(data, card)));
          if (keyboard) setFocusTarget({ id: card.id, stage: card.stage, control: "grip" });
          return;
        }
        setMessage(announce("dropped", data, card, drop));
        move(card, drop, keyboard ? "grip" : undefined);
      }}
    >
      <span id="pipeline-drag-help" className="sr-only">
        Press Space or Enter to pick up or drop the card. Move with the arrow keys. Press Escape to
        cancel.
      </span>
      <div className="sr-only" role="status" aria-atomic="true" aria-label="Card movement">
        {message}
      </div>
      <div
        className={styles.scroll}
        ref={viewport}
        role="region"
        aria-label="Pipeline board"
        aria-busy={busy}
      >
        <div className={styles.board}>
          {data.columns.map((column) => (
            <Column
              key={column.stage}
              column={column}
              today={data.today}
              drop={drag?.drop?.stage === column.stage ? drag.drop : undefined}
              activeId={drag?.card.id}
              visible={visible(column.stage)}
              showMore={() => setLimits((limits) => ({ ...limits, [column.stage]: column.count }))}
              actions={actions}
              onAdd={onAdd}
            />
          ))}
        </div>
      </div>
    </DragDropProvider>
  );
}

function scrollToDrop(viewport: HTMLElement | null, drop: Drop) {
  const column = viewport?.querySelector(`[data-column="${drop.stage}"]`);
  const destination =
    column?.querySelector(`[data-deal="${drop.before_id}"]`) ??
    column?.querySelector("ol > :last-child") ??
    column;
  destination?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
