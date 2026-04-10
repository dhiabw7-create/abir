import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export function Modal({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange
}: {
  trigger: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/[0.55] backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className={cn(
            "medical-card fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 p-0 outline-none transition-all data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 professional-shadow-lg"
          )}
        >
          <div className="border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-blue-50/50 px-6 py-5 dark:border-slate-800/60 dark:from-slate-900/50 dark:to-blue-950/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {typeof title === "string" ? (
                  <Dialog.Title className="text-xl font-bold tracking-tight">{title}</Dialog.Title>
                ) : (
                  <Dialog.Title asChild>
                    <div>{title}</div>
                  </Dialog.Title>
                )}
                {description ? (
                  <Dialog.Description className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close className="rounded-lg p-1.5 transition-all hover:bg-slate-200/80 dark:hover:bg-slate-700/80">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
