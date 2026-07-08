import { useEffect } from "react"

export function useOutsideDismiss(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return

    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [ref, onDismiss, active])
}
