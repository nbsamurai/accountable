import { useEffect, useRef } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import type { DeleteMessage } from "../lib/deleteMessages";
import { Button } from "./Button";
import formStyles from "./FormDialog.module.css";
import styles from "./DeleteDialog.module.css";

type Props = {
  message: DeleteMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
};

/** Deleting always asks first, in an alert dialog with Cancel focused (spec 4.10). */
export function DeleteDialog({ message, isOpen, onClose, onConfirm, isPending }: Props) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isKeyboardDismissDisabled={isPending}
      className={formStyles.overlay}
    >
      <Modal className={`${formStyles.modal} ${styles.modal}`}>
        <Dialog ref={dialog} role="alertdialog" className={formStyles.dialog}>
          {message && (
            <>
              <Heading slot="title" className={formStyles.title}>
                {message.title}
              </Heading>
              <p>{message.body}</p>
              <div className={formStyles.buttons}>
                <Button variant="secondary" onPress={onClose} isDisabled={isPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onPress={onConfirm} isPending={isPending}>
                  {message.button}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
