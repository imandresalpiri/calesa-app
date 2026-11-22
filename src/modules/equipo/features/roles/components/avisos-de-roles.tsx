'use client'

import { CircleAlertIcon } from 'lucide-react'
import { Modal } from '@/shared/ui/modal'

type Props = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  // Uno por renglón.
  avisos: readonly string[]
}

// Los avisos de un rol o de la página, en un modal por URL (`?panel=avisos&rol=`). Un solo cierre: Esc, la ✕ o el clic afuera; el foco vuelve al «!».
export function AvisosDeRoles({ abierto, alCerrar, titulo, avisos }: Props) {
  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo={titulo} ancho="amplio">
      <ul className="grid gap-3">
        {avisos.map((aviso) => (
          <li
            key={aviso}
            className="flex items-start gap-2 text-(length:--text-sm) text-(--color-ink)"
          >
            <CircleAlertIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-(--color-ink-soft)"
            />
            {aviso}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
