'use client'

import { useAction } from 'next-safe-action/hooks'
import type { CatalogoLeido } from '@/shared/lib/catalogo'
import { gruposDelEditor, type GruposDelEditor } from '@/shared/ui/campos'
import { crearGrupoDeCampos } from '../actions/crear-grupo'

// El catálogo de grupos de campos de los leads para el editor, con su «crear» (el combo del panel de un campo).
export function useGruposDeCampos(leidos: CatalogoLeido, puedeCrear: boolean): GruposDelEditor {
  const { executeAsync } = useAction(crearGrupoDeCampos)
  return gruposDelEditor({
    ...leidos,
    puedeCrear,
    enviar: (nombre) => executeAsync({ nombre }),
  })
}
