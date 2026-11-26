'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { EnlaceDeAyudaDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se quita (el último que se vio, mientras el diálogo se va).
  enlace: EnlaceDeAyudaDeLaEmpresa | null
  enCurso: boolean
  alQuitar: (enlace: EnlaceDeAyudaDeLaEmpresa) => Promise<boolean>
}

// «Quitar» un enlace de ayuda de la empresa (`?panel=quitar-enlace-de-ayuda&enlace=<id>`): lo irreversible pide confirmar nombrando el enlace.
// Desaparece también del menú de cada persona. Para dejar de mostrarlo sin perderlo está «Desactivar».
export function QuitarEnlaceDeAyuda({ abierto, alCerrar, enlace, enCurso, alQuitar }: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (enlace) {
          await alQuitar(enlace)
        }
        alCerrar()
      }}
      titulo={enlace ? `Quitar el enlace «${enlace.titulo}»` : 'Quitar el enlace'}
      descripcion="Deja de verse en el menú de todo el equipo y no se puede deshacer. Para dejar de mostrarlo sin perderlo, desactívalo."
      etiquetaConfirmar="Quitar enlace"
      enCurso={enCurso}
      focoAlCerrar={() => false}
    />
  )
}
