import { stage } from "../lib/stages";
import { dropPosition } from "./boardState";
import type { BoardData, CardDeal, Drop } from "./queries";

export function announce(
  action: "picked" | "over" | "dropped" | "canceled",
  board: BoardData,
  card: CardDeal,
  drop: Drop,
) {
  const { index, count } = dropPosition(board, card, drop);
  const column = stage(drop.stage).name;
  const position = `position ${index + 1} of ${count}`;
  switch (action) {
    case "picked":
      return `Picked up ${card.name}, in ${column}, ${position}`;
    case "over":
      return `Over ${column}, ${position}`;
    case "dropped":
      return `Dropped in ${column}, ${position}`;
    case "canceled":
      return `Put back ${card.name} in ${column}, ${position}`;
  }
}
