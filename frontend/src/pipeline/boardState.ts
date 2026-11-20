import { isOpen, stage, STAGES, type Stage } from "../lib/stages";
import type { BoardData, BoardTotals, CardDeal, Drop } from "./queries";

const roundRevenue = (weighted: number) => Math.floor((weighted + 50) / 100);
export const INITIAL_CARDS = 50;
const total = (cards: CardDeal[]): BoardTotals => ({
  count: cards.length,
  value: cards.reduce((sum, card) => sum + (card.value ?? 0), 0),
  expected_revenue: roundRevenue(
    cards.reduce((sum, card) => sum + (card.value ?? 0) * card.probability, 0),
  ),
});

export function applyMove(board: BoardData, card: CardDeal, drop: Drop): BoardData {
  const changed = card.stage !== drop.stage;
  const close = changed && !isOpen(drop.stage) ? board.today : card.close_date;
  const moved: CardDeal = {
    ...card,
    stage: drop.stage,
    probability: changed ? stage(drop.stage).probability : card.probability,
    close_date: close,
    late: isOpen(drop.stage) && close !== null && close < board.today,
  };
  const columns = board.columns.map((column) => {
    if (column.stage !== card.stage && column.stage !== drop.stage) return column;
    const cards = column.cards.filter((item) => item.id !== card.id);
    if (column.stage === drop.stage) {
      const index = cards.findIndex((item) => item.id === drop.before_id);
      cards.splice(index < 0 ? cards.length : index, 0, moved);
    }
    return { ...column, cards, ...total(cards) };
  });
  return {
    ...board,
    columns,
    totals: total(columns.flatMap((column) => (isOpen(column.stage) ? column.cards : []))),
  };
}

export function firstDrop(board: BoardData, card: CardDeal): Drop {
  const cards = board.columns.find((column) => column.stage === card.stage)!.cards;
  return {
    stage: card.stage,
    before_id: cards[cards.findIndex((item) => item.id === card.id) + 1]?.id ?? null,
  };
}

export function dropPosition(board: BoardData, card: CardDeal, drop: Drop) {
  const cards = board.columns
    .find((column) => column.stage === drop.stage)!
    .cards.filter((item) => item.id !== card.id);
  const index = cards.findIndex((item) => item.id === drop.before_id);
  return { index: index < 0 ? cards.length : index, count: cards.length + 1 };
}

export function keyboardDrop(
  board: BoardData,
  card: CardDeal,
  drop: Drop,
  key: string,
  limits: Partial<Record<Stage, number>>,
): Drop {
  const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  const stageIndex = STAGES.findIndex((step) => step.key === drop.stage);
  const next = STAGES[stageIndex + horizontal];
  if (!next) return drop;
  const vertical = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  const { index } = dropPosition(board, card, drop);
  const column = board.columns.find((item) => item.stage === next.key)!;
  const cards = column.cards.filter((item) => item.id !== card.id);
  const limit = limits[next.key] ?? 50;
  const sourceIsVisible = column.cards.slice(0, limit).some((item) => item.id === card.id);
  const lastSlot = Math.min(limit - Number(sourceIsVisible), cards.length);
  const place = Math.min(lastSlot, Math.max(0, index + vertical));
  return { stage: next.key, before_id: cards[place]?.id ?? null };
}
