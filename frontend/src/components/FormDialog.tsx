import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Dialog, Form, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Button } from "./Button";
import styles from "./FormDialog.module.css";

type Props = {
  title: string;
  isOpen: boolean;
  initialFocus: string;
  onClose: () => void;
  onSubmit: () => void;
  isPending?: boolean;
  /** Messages for fields by name, from the server or the form's own checks. */
  fieldErrors?: Record<string, string>;
  /** A message for the whole form, shown at the top. */
  formError?: string | null;
  /** Stops the save, such as when the deal's main contact works elsewhere. */
  canSave?: boolean;
  children: ReactNode;
};

/**
 * Adding and editing happen in a modal dialog (spec 4.8): labels above fields, errors under
 * them, focus on the first field with an error, Enter saves, and Escape or Cancel closes.
 */
export function FormDialog({
  title,
  isOpen,
  initialFocus,
  onClose,
  onSubmit,
  isPending,
  fieldErrors,
  formError,
  canSave = true,
  children,
}: Props) {
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const control = form.current?.elements.namedItem(initialFocus);
      if (control instanceof HTMLElement) control.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [initialFocus, isOpen]);

  // After a failed save, focus moves to the first field with an error.
  useEffect(() => {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return;
    const frame = requestAnimationFrame(() => {
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [fieldErrors]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPending && canSave) onSubmit();
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      className={styles.overlay}
      isKeyboardDismissDisabled={isPending}
    >
      <Modal className={styles.modal}>
        <Dialog className={styles.dialog}>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          <Form ref={form} onSubmit={submit} validationErrors={fieldErrors} className={styles.form}>
            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}
            {children}
            <div className={styles.buttons}>
              <Button variant="secondary" onPress={onClose} isDisabled={isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isPending={isPending} isDisabled={!canSave}>
                Save
              </Button>
            </div>
          </Form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
