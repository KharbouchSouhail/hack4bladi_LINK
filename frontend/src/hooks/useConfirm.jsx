import { useState } from "react";
import { ConfirmDialog } from "../components/ui/Dialog.jsx";
import { useAction } from "./useQuery.js";

// Confirmation flow for destructive actions: ask(item) opens the dialog, confirming runs action(item).
export function useConfirm({ title, message, confirmLabel = "Delete", action, success }) {
  const [target, setTarget] = useState(null);
  const [run, pending] = useAction();

  async function confirm() {
    await run(() => action(target), { success: success?.(target) });
    // Close either way: on a blocked delete, the error toast explains why.
    setTarget(null);
  }

  const dialog = (
    <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} onConfirm={confirm} title={target ? title(target) : ""} confirmLabel={confirmLabel} danger pending={pending}>
      {target && message(target)}
    </ConfirmDialog>
  );

  return [setTarget, dialog];
}
