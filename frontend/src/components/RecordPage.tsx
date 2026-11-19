import { Pencil, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router";
import { isNotFound } from "../lib/api";
import { Button } from "./Button";
import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";
import { Skeleton, SkeletonLines } from "./Skeleton";
import styles from "./RecordPage.module.css";

export function useRecordId() {
  const { id = "" } = useParams();
  const value = Number(id);
  return /^\d+$/.test(id) && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export function RecordFallback({ kind, section, error, missing, onRetry }: {
  kind: string;
  section: string;
  error: Error | null;
  missing: boolean;
  onRetry: () => void;
}) {
  if (!error && !missing) {
    return (
      <div className={styles.stack}>
        <Skeleton height={32} width={220} />
        <Panel as="div"><SkeletonLines label={`Loading ${kind}`} /></Panel>
      </div>
    );
  }
  const gone = missing || isNotFound(error);
  return (
    <>
      <PageHeader title={gone ? `This ${kind} no longer exists.` : `Couldn't load this ${kind}.`} />
      <Panel as="div">
        {gone
          ? <Link to={`/${section.toLowerCase()}`}>Back to {section}</Link>
          : <Button onPress={onRetry}>Try again</Button>}
      </Panel>
    </>
  );
}

export function RecordActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <Button onPress={onEdit} icon={<Pencil size={16} aria-hidden="true" />}>Edit</Button>
      <Button onPress={onDelete} icon={<Trash2 size={16} aria-hidden="true" />}>Delete</Button>
    </>
  );
}
