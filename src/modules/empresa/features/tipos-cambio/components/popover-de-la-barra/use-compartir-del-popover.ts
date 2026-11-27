'use client'

import { useCallback, useState } from 'react'

const MOTIVO_EDITANDO = 'Termina de cambiar el valor para compartir.'

// El estado de «Compartir» dentro del popover de la barra. `puedeCompartir`: hay tipos a la vista (también con el Modo Live: la vista previa va sin moneda).
// Con algo escrito en un editor, «Compartir» espera: el panel reemplazaría la lista y se
// perdería lo tipeado. `retener` es el `alRetener` de los editores: avisa al popover y se acuerda.
export function useCompartirDelPopover(
  puedeCompartir: boolean,
  alRetener: (retener: boolean) => void,
) {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState(false)
  const retener = useCallback(
    (si: boolean) => {
      setEditando(si)
      alRetener(si)
    },
    [alRetener],
  )
  return {
    compartiendo: abierto && puedeCompartir,
    retener,
    alCompartir: puedeCompartir ? () => void setAbierto(true) : null,
    alVolver: () => void setAbierto(false),
    motivoSinCompartir: editando ? MOTIVO_EDITANDO : null,
  }
}
