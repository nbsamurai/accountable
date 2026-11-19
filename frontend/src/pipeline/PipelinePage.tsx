import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { SkeletonLines } from "../components/Skeleton";
import { StageBar } from "../components/StageBar";
import { DealForm } from "../deals/DealForm";
import { useDeal } from "../deals/queries";
import { dealMoveMessage } from "../deals/StagePath";
import { money, number } from "../lib/format";
import type { Stage } from "../lib/stages";
import { Board } from "./Board";
import { applyMove } from "./boardState";
import styles from "./Board.module.css";
import { useMoveCard, usePipeline, type CardDeal } from "./queries";

export default function PipelinePage() {
  const pipeline = usePipeline();
  const move = useMoveCard();
  const [dialog, setDialog] = useState<{ stage: Stage } | { id: number } | null>(null);
  const edit = useDeal(dialog && "id" in dialog ? dialog.id : undefined);
  const base = pipeline.data;
  const pending = move.isPending ? move.variables : undefined;
  const pendingCard = pending && base?.columns.flatMap((column) => column.cards).find((card) => card.id === pending.id);
  const data = base && pending && pendingCard ? applyMove(base, pendingCard, pending.drop) : base;
  const openEdit = (card: CardDeal) => setDialog({ id: card.id });
  const close = () => setDialog(null);
  return (
    <>
      <PageHeader title="Pipeline" actions={
        <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />} onPress={() => setDialog({ stage: "new" })}>Add deal</Button>
      } />
      {pipeline.isPending && <Panel as="div"><SkeletonLines label="Loading pipeline" /></Panel>}
      {pipeline.isError && <Panel title="Couldn't load the pipeline"><Button onPress={() => void pipeline.refetch()}>Try again</Button></Panel>}
      {data && (
        <>
          <Panel className={styles.summary} aria-label="Pipeline summary">
            <dl className={styles.figures}>
              <div><dt>Open pipeline</dt><dd className="mono">{money(data.totals.value)}</dd></div>
              <div><dt>Expected revenue</dt><dd className="mono">{money(data.totals.expected_revenue)}</dd></div>
              <div><dt>Open deals</dt><dd className="mono">{number(data.totals.count)}</dd></div>
            </dl>
            <StageBar label="By stage" count={data.totals.count} total={data.totals.value} stages={data.columns} />
          </Panel>
          <Board data={data} busy={move.isPending} onAdd={(stage) => setDialog({ stage })} onEdit={openEdit}
            onMove={(card, drop) => move.mutate({ id: card.id, drop }, {
              onSuccess: (result) => { if (card.stage !== drop.stage) toast.success(dealMoveMessage(result)); },
              onError: () => toast.error(`Couldn't move ${card.name}. The card was put back.`, { duration: Infinity }),
            })}
          />
        </>
      )}
      {dialog && "stage" in dialog && <DealForm deal={null} defaults={{ stage: dialog.stage }} isOpen onClose={close} />}
      {dialog && "id" in dialog && edit.data && <DealForm deal={edit.data} isOpen onClose={close} />}
      {dialog && "id" in dialog && edit.isError && <Panel title="Couldn't load the deal"><Button onPress={() => void edit.refetch()}>Try again</Button> <Button onPress={close}>Cancel</Button></Panel>}
    </>
  );
}
