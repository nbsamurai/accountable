import { parseDate, parseDateTime } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
} from "react-aria-components";
import { fieldStyles } from "./Field";
import styles from "./DateField.module.css";

type Props = {
  name: string;
  label: string;
  /** `YYYY-MM-DD`, or a local date and time when includeTime is set. */
  value: string | null;
  onChange: (value: string | null) => void;
  includeTime?: boolean;
  required?: boolean;
};

/** A date picker: type the date, or choose it from a calendar. Dates have no time, so they never shift. */
export function DateField({
  name,
  label,
  value,
  onChange,
  includeTime = false,
  required = false,
}: Props) {
  const parse = includeTime ? parseDateTime : parseDate;
  return (
    <DatePicker
      name={name}
      value={value ? parse(value) : null}
      onChange={(date) => onChange(date ? date.toString() : null)}
      granularity={includeTime ? "minute" : "day"}
      isRequired={required}
      className={fieldStyles.field}
    >
      <Label className={fieldStyles.label}>
        {label}
        {required && <span className={fieldStyles.required}> (required)</span>}
      </Label>
      <Group className={`${fieldStyles.control} ${styles.group}`}>
        <DateInput className={styles.input}>
          {(segment) => <DateSegment segment={segment} className={styles.segment} />}
        </DateInput>
        {value && !required && (
          <Button
            slot={null}
            className={styles.button}
            aria-label={`Clear ${label.toLowerCase()}`}
            onPress={() => onChange(null)}
          >
            <X size={14} aria-hidden="true" />
          </Button>
        )}
        <Button className={styles.button} aria-label={`Choose ${label.toLowerCase()}`}>
          <CalendarDays size={16} aria-hidden="true" />
        </Button>
      </Group>
      <FieldError className={fieldStyles.error} />
      <Popover className={styles.popover} offset={4}>
        <Dialog className={styles.dialog} aria-label={label}>
          <Calendar className={styles.calendar}>
            <header className={styles.header}>
              <Button slot="previous" className={styles.button}>
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <Heading className={styles.heading} />
              <Button slot="next" className={styles.button}>
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </header>
            <CalendarGrid className={styles.grid}>
              {(date) => <CalendarCell date={date} className={styles.cell} />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
