import { Check } from "lucide-react";
import { ToggleButton, ToggleButtonGroup, type Key } from "react-aria-components";
import { toast } from "sonner";
import { STAGES, stage, type Stage } from "../lib/stages";
import { useSaveDeal, type Deal, type DealChange } from "./queries";
import styles from "./StagePath.module.css";

export function dealMoveMessage({ deal, contact }: DealChange) {
  const moved = `${deal.name} moved to ${stage(deal.stage).name}.`;
  return contact ? `${moved} ${contact.name} is now a customer.` : moved;
}

/**
 * The six stages as a row of buttons (spec 4.6). The arrow keys only move focus along the
 * row. Space, Enter or a click chooses a stage, which saves at once. A radio group would
 * save every stage the arrow keys pass through, such as Won on the way to Lost.
 */
export function StagePath({ deal }: { deal: Deal }) {
  const save = useSaveDeal();
  const value = save.isPending ? save.variables?.values.stage ?? deal.stage : deal.stage;

  function choose(keys: Set<Key>) {
    const [next] = keys;
    if (save.isPending || next === undefined || next === value) return;
    save.mutate({ id: deal.id, values: { stage: next as Stage } }, {
      onSuccess: (result) => toast.success(dealMoveMessage(result)),
      onError: (error) => toast.error(error.message, { duration: Infinity }),
    });
  }

  return (
    <ToggleButtonGroup
      aria-label="Deal stage"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={choose}
      className={styles.path}
    >
      {STAGES.map((step) => (
        <ToggleButton key={step.key} id={step.key} className={`${styles.step} ${step.className}`}>
          {value === step.key && <Check size={16} aria-hidden="true" />}
          {step.name}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
