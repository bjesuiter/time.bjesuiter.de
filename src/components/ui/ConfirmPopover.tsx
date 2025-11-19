import { useId, ReactNode, cloneElement, isValidElement } from "react";

interface ConfirmPopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  okLabel?: ReactNode;
  cancelLabel?: ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmPopover({
  trigger,
  children,
  okLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmPopoverProps) {
  const popoverId = useId();

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  // Clone the trigger element and add popover attributes
  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement, {
        popovertarget: popoverId,
        popovertargetaction: "show",
      })
    : trigger;

  return (
    <>
      {triggerElement}
      <div
        id={popoverId}
        popover="auto"
        className="bg-white rounded-lg p-6 max-w-md w-200 inset-auto bottom-[anchor(top)] right-[anchor(right)] border-2 border-red-500/60 shadow-red-500/50 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">{children}</div>
        <div className="flex gap-3 justify-end">
          <button
            popovertarget={popoverId}
            popovertargetaction="hide"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            popovertarget={popoverId}
            popovertargetaction="hide"
            onClick={handleConfirm}
            className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
          >
            {okLabel}
          </button>
        </div>
      </div>
    </>
  );
}
