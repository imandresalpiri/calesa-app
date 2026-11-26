'use client'

import { useAction } from 'next-safe-action/hooks'
import type { CatalogoLeido } from '@/shared/lib/catalogo'
import { gruposDelEditor, type GruposDelEditor } from '@/shared/ui/campos'
import { crearGrupoDelOrigen } from '../actions/crear-grupo'

// El catálogo de grupos de campos de un origen para el editor, con su «crear» (el combo del panel de un campo).
export function useGruposDelOrigen(
  origenId: string,
  leidos: CatalogoLeido,
  puedeCrear: boolean,
): GruposDelEditor {
  const { executeAsync } = useAction(crearGrupoDelOrigen)
  return gruposDelEditor({
    ...leidos,
    puedeCrear,
    enviar: (nombre) => executeAsync({ origenId, nombre }),
  })
}
