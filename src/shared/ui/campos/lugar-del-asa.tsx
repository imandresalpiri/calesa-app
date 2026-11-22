import { GripVerticalIcon } from 'lucide-react'

// El lugar del asa mientras el arrastre no llegó (o sin red): el mismo tamaño, para que la fila no salte cuando aparece.
export function LugarDelAsa() {
  return (
    <span
      aria-hidden
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-(--color-ink-faint) opacity-50"
    >
      <GripVerticalIcon className="size-4" />
    </span>
  )
}
