import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`side-panel${wide ? " side-panel--wide" : ""}`}>
          <header className="side-panel__header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description ? <Dialog.Description>{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="icon-button" aria-label="关闭">
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className="side-panel__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
