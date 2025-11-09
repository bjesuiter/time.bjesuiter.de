import { useRef, ReactNode, cloneElement, isValidElement } from 'react'

interface ConfirmPopoverProps {
  trigger: ReactNode
  children: ReactNode
  okLabel?: ReactNode
  cancelLabel?: ReactNode
  onConfirm: () => void
  onCancel?: () => void
}

export function ConfirmPopover({
  trigger,
  children,
  okLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleConfirm = () => {
    popoverRef.current?.hidePopover()
    onConfirm()
  }

  const handleCancel = () => {
    popoverRef.current?.hidePopover()
    onCancel?.()
  }

  const handleOpen = () => {
    popoverRef.current?.showPopover()
  }

  // Clone the trigger element and add onClick handler
  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          handleOpen()
          // Call original onClick if it exists
          const originalOnClick = (trigger as React.ReactElement).props.onClick
          if (originalOnClick) {
            originalOnClick(e)
          }
        },
      })
    : trigger

  return (
    <>
      {triggerElement}
      <div
        ref={popoverRef}
        popover="auto"
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backdropFilter: 'blur(0px)',
        }}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={handleCancel}
        />
        <div
          className="relative bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            {children}
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              {okLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

