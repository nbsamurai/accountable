import type { ReactNode } from "react";
import { FieldError, Input, Label, TextArea, TextField } from "react-aria-components";
import styles from "./Field.module.css";

type TextProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Marks the label "(required)" and checks the field isn't empty. */
  requiredMessage?: string;
  /** The keyboard to offer. The server checks the value, so the browser's own checks stay off. */
  inputMode?: "numeric" | "text" | "email" | "tel" | "url";
  multiline?: boolean;
  autoFocus?: boolean;
  description?: ReactNode;
};

/** A text field with its label above it and its error under it, linked to it. */
export function TextInput({ name, label, value, onChange, requiredMessage, multiline, autoFocus, inputMode, description }: TextProps) {
  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      type="text"
      isRequired={!!requiredMessage}
      validate={requiredMessage ? (text) => (text.trim() ? null : requiredMessage) : undefined}
      autoFocus={autoFocus}
      inputMode={inputMode}
      className={styles.field}
    >
      <Label className={styles.label}>
        {label}
        {requiredMessage && <span className={styles.required}> (required)</span>}
      </Label>
      {multiline ? <TextArea className={styles.textarea} rows={4} /> : <Input className={styles.input} />}
      {description && <p className={styles.description}>{description}</p>}
      <FieldError className={styles.error} />
    </TextField>
  );
}

export { styles as fieldStyles };
