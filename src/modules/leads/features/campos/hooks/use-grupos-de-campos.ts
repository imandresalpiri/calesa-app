'use client'

import { useAction } from 'next-safe-action/hooks'
import type { CatalogoLeido } from '@/shared/lib/catalogo'
import { gruposDelEditor, type GruposDelEditor } from '@/shared/ui/campos'
import { operacionesDesdeAcciones } from '@/shared/ui/catalogo-en-drawer'
import { agregarGrupoDeCampos, crearGrupoDeCampos } from '../actions/crear-grupo'
import { guardarGrupoDeCampos } from '../actions/guardar-grupo'
import { moverGrupoDeCampos } from '../actions/mover-grupo'
import { quitarGrupoDeCampos } from '../actions/quitar-grupo'

const REVISA_EL_GRUPO = 'Revisa el nombre del grupo: hasta 40 caracteres.'

// El catálogo de grupos de campos de los leads para el editor: su «crear» (el combo del panel de un campo, sin revalidar) y las
// operaciones del drawer «Grupos» (revalidan).
export function useGruposDeCampos(leidos: CatalogoLeido, puedeCrear: boolean): GruposDelEditor {
  const crear = useAction(crearGrupoDeCampos)
  const agregar = useAction(agregarGrupoDeCampos)
  const guardar = useAction(guardarGrupoDeCampos)
  const mover = useAction(moverGrupoDeCampos)
  const quitar = useAction(quitarGrupoDeCampos)
  return gruposDelEditor({
    ...leidos,
    puedeCrear,
    enviar: (nombre) => crear.executeAsync({ nombre }),
    operaciones: operacionesDesdeAcciones(
      {
        agregar: (nombre) => agregar.executeAsync({ nombre }),
        guardar: (grupo, cambios) =>
          guardar.executeAsync({
            id: grupo.id,
            actualizadoEnEsperado: grupo.actualizadoEn,
            cambios,
          }),
        mover: (grupo, despuesDe) =>
          mover.executeAsync({
            id: grupo.id,
            actualizadoEnEsperado: grupo.actualizadoEn,
            despuesDe,
          }),
        quitar: (grupo, destino) =>
          quitar.executeAsync({
            id: grupo.id,
            actualizadoEnEsperado: grupo.actualizadoEn,
            destino,
          }),
        enCurso: agregar.isPending || guardar.isPending || mover.isPending || quitar.isPending,
      },
      REVISA_EL_GRUPO,
    ),
  })
}
