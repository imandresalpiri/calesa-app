'use client'

import { useMemo } from 'react'
import { useRegional } from '@/shared/ui/regional'
import type { Diseno } from '../../../entities/diseno'
import { contextoDeDondeSale, deDondeSale } from '../../../entities/formula/de-donde-sale'
import { totalesDeLaUnidad } from '../../../entities/formula/totales-de-la-planilla'
import { modoDelMotor, type UnidadDeEjemplo } from '../../../entities/formula/unidad-de-ejemplo'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'
import { useUnidadDeLaPlanilla } from './use-unidad-de-la-planilla'

type Args = {
  editor: EditorDeLaFormula
  diseno: Diseno | null
  unidad: UnidadDeEjemplo
  // La clave del modo de tipo de cambio elegido.
  modo: string | null
}

// El cálculo con la unidad de ejemplo y el modo elegido, «de dónde sale» de cada fila (una vez por fórmula de trabajo) y las líneas de «Totales».
export function useCalculoDeLaPlanilla({ editor, diseno, unidad, modo: clave }: Args) {
  const { locale } = useRegional()
  const modos = useMemo(() => diseno?.cabecera.modos ?? [], [diseno])
  const delModo = modos.find((m) => m.clave === clave)
  const modo = useMemo(() => (delModo === undefined ? undefined : modoDelMotor(delModo)), [delModo])
  const { vista, cifras } = useUnidadDeLaPlanilla({
    validada: editor.validada,
    filas: editor.filas,
    lectura: editor.lectura,
    unidad,
    modo,
  })
  const dicho = useMemo(() => contextoDeDondeSale(editor.trabajo, locale), [editor.trabajo, locale])
  const dichas = useMemo(
    () => new Map(editor.filas.map((f) => [f.id, deDondeSale(f.nodo, dicho)])),
    [editor.filas, dicho],
  )
  const lineas = useMemo(
    () =>
      vista?.tipo === 'calculada' && editor.validada !== null
        ? totalesDeLaUnidad(editor.validada, vista, modo, dicho)
        : [],
    [vista, editor.validada, modo, dicho],
  )
  return { locale, modos, delModo, modo, vista, cifras, dicho, dichas, lineas }
}

export type CalculoDeLaPlanilla = ReturnType<typeof useCalculoDeLaPlanilla>
