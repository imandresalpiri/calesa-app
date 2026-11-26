'use client'

import { useAction } from 'next-safe-action/hooks'
import type { CatalogoLeido } from '@/shared/lib/catalogo'
import { gruposDelEditor, type GruposDelEditor } from '@/shared/ui/campos'
import { operacionesDesdeAcciones } from '@/shared/ui/catalogo-en-drawer'
import { agregarGrupoDelOrigen, crearGrupoDelOrigen } from '../actions/crear-grupo'
import { guardarGrupoDelOrigen } from '../actions/guardar-grupo'
import { moverGrupoDelOrigen } from '../actions/mover-grupo'
import { quitarGrupoDelOrigen } from '../actions/quitar-grupo'

const REVISA_EL_GRUPO = 'Revisa el nombre del grupo: hasta 40 caracteres.'

// El catálogo de grupos de campos de un origen para el editor: su «crear» (el combo del panel de un campo, sin revalidar) y las
// operaciones del drawer «Grupos» (revalidan). Sin `origenes.gestionar`, el drawer es de sólo lectura: lo decide el editor.
export function useGruposDelOrigen(
  origenId: string,
  leidos: CatalogoLeido,
  puedeCrear: boolean,
): GruposDelEditor {
  const crear = useAction(crearGrupoDelOrigen)
  const agregar = useAction(agregarGrupoDelOrigen)
  const guardar = useAction(guardarGrupoDelOrigen)
  const mover = useAction(moverGrupoDelOrigen)
  const quitar = useAction(quitarGrupoDelOrigen)
  const version = (grupo: { id: string; actualizadoEn: string }) => ({
    origenId,
    id: grupo.id,
    actualizadoEnEsperado: grupo.actualizadoEn,
  })
  return gruposDelEditor({
    ...leidos,
    puedeCrear,
    enviar: (nombre) => crear.executeAsync({ origenId, nombre }),
    operaciones: operacionesDesdeAcciones(
      {
        agregar: (nombre) => agregar.executeAsync({ origenId, nombre }),
        guardar: (grupo, cambios) => guardar.executeAsync({ ...version(grupo), cambios }),
        mover: (grupo, despuesDe) => mover.executeAsync({ ...version(grupo), despuesDe }),
        quitar: (grupo, destino) => quitar.executeAsync({ ...version(grupo), destino }),
        enCurso: agregar.isPending || guardar.isPending || mover.isPending || quitar.isPending,
      },
      REVISA_EL_GRUPO,
    ),
  })
}
