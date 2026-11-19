import { Check } from "lucide-react";
import { Radio, RadioGroup } from "react-aria-components";
import { toast } from "sonner";
import { STAGES, stage, type Stage } from "../lib/stages";
import { useSaveDeal, type Deal, type DealChange } from "./queries";
import styles from "./StagePath.module.css";

export function dealMoveMessage({ deal, contact }: DealChange) {
  const moved = `${deal.name} moved to ${stage(deal.stage).name}.`;
  return contact ? `${moved} ${contact.name} is now a customer.` : moved;
}

export function StagePath({ deal }: { deal: Deal }) {
  const save = useSaveDeal();
  const value = save.isPending ? save.variables?.values.stage ?? deal.stage : deal.stage;
  return (
    <RadioGroup
      aria-label="Deal stage"
      orientation="horizontal"
      className={styles.path}
      value={value}
      isReadOnly={save.isPending}
      onChange={(stage) => save.mutate({ id: deal.id, values: { stage: stage as Stage } }, {
        onSuccess: (result) => toast.success(dealMoveMessage(result)),
        onError: (error) => toast.error(error.message, { duration: Infinity }),
      })}
    >
      {STAGES.map((step) => (
        <Radio key={step.key} value={step.key} className={`${styles.step} ${step.className}`}>
          {value === step.key && <Check size={16} aria-hidden="true" />}
          {step.name}
        </Radio>
      ))}
    </RadioGroup>
  );
}
