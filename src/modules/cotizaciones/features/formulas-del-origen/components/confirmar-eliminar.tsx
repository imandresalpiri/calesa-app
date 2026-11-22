'use client'

import { useAction } from 'next-safe-action/hooks'
import { resolverAcciones } from '@/shared/lib/acciones-del-aviso'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { CAUSA_USADA } from '../../../entities/formulas-del-origen/resultado'
import {
  CLAVE_DE_LA_FORMULA_DEL_PANEL,
  PANEL_ARCHIVAR_FORMULA,
} from '../../../entities/formulas-del-origen/rutas'
import { eliminarFormulaDelOrigen } from '../actions/eliminar-formula'
import { useConfirmarEnLaFormula } from '../hooks/use-confirmar-en-la-formula'
import { ConfirmarEnLaFormula } from './confirmar-en-la-formula'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenId: string
  formula: Pick<FormulaDeLaLista, 'id' | 'nombre' | 'actualizadoEn'>
  // Es la fórmula elegida en la barra: al entrar se va a esta ruta (la pestaña con la de trabajo); si no, se vuelve a leer la pantalla.
  salirA: string | null
}

export const DESCRIPCION_DE_ELIMINAR =
  'Se borra con su planilla, su hoja y su tarjeta. No se puede deshacer.'

// Ya se usó para cotizar o estuvo activa (23503): la salida es archivarla.
function archivarSiSeUso(error: ErrorApp, formulaId: string) {
  if (error.causa !== CAUSA_USADA) return {}
  return {
    acciones: resolverAcciones([
      {
        accion: {
          tipo: 'panel',
          etiqueta: 'Archivar',
          panel: PANEL_ARCHIVAR_FORMULA,
          valores: { [CLAVE_DE_LA_FORMULA_DEL_PANEL]: formulaId },
        },
        puede: true,
      },
    ]),
  }
}

// «Eliminar «<nombre>»» (`?panel=eliminar-formula&cual=<id>`): sólo una que nunca estuvo activa; con la versión que se leyó.
export function ConfirmarEliminar({ abierto, alCerrar, origenId, formula, salirA }: Props) {
  const eliminar = useAction(eliminarFormulaDelOrigen)
  const estado = useConfirmarEnLaFormula({
    alCerrar,
    salirA,
    pedir: () =>
      enviarAccion(
        eliminar.executeAsync({ id: formula.id, origenId, esperada: formula.actualizadoEn }),
        'No se pudo eliminar la fórmula.',
      ),
    hecho: `Eliminaste «${formula.nombre}».`,
    accionesDelRechazo: (error) => archivarSiSeUso(error, formula.id),
  })
  return (
    <ConfirmarEnLaFormula
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Eliminar «${formula.nombre}»`}
      descripcion={DESCRIPCION_DE_ELIMINAR}
      etiqueta="Eliminar"
      estado={estado}
    />
  )
}
