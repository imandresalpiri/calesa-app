'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { CatalogoDeTablas } from '../../../entities/compilador'
import type { Formula } from '../../../entities/formula'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import { filasParaDibujar } from './use-editor-de-la-formula.soporte'
import { useGuardadoDelEditor } from './use-guardar-borrador'
import { useVistaPrevia } from './use-vista-previa'

// Lo que el último cambio que entró soltó de una fila (nombres de campo).
export type Aplicada = { id: string; soltados: readonly string[] }
// El rechazo de `validarFormula()` sobre la fórmula de trabajo: en su fila, en la cabecera de su banda o, si no nombra ninguna, arriba de la planilla.
export type RechazoEnElEditor = { mensaje: string; filaId: string | null; grupoId: string | null }

type PropsDelEditor = {
  origenId: string
  leida: FormulaParaEditar
  // El catálogo de tablas del origen (BUSCARV); null si no se pudo leer.
  tablas?: CatalogoDeTablas
  // Con el Modo Live (Configuración de orígenes en «Sólo lectura»): se ve y nada cambia.
  soloLectura?: boolean
}

// La fórmula de trabajo de la planilla: empieza en la leída y cambia sólo con `cambiar()` (lo escrito en una celda que entró, insertar, mover, eliminar, el tipo de
// celda, las bandas). Lo que se escribe no se compila al tipear: vive en la edición de la planilla y llega aquí al aplicar. Tras cada cambio (y al leer) corre
// `validarFormula()`: lo que rechaza queda aplicado y se dice en su fila (un borrador inválido sólo vive aquí: la base valida al guardar). `abierta` es la fila con
// texto sin aplicar: «Guardar el borrador» espera. Guardar y lo aplicado en la pestaña son de `useGuardadoDelEditor`; mientras guarda, nada cambia.
export function useEditorDeLaFormula({
  origenId,
  leida,
  tablas = null,
  soloLectura = false,
}: PropsDelEditor) {
  const [trabajo, setTrabajo] = useState<Formula>(leida.formula)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [aplicada, setAplicada] = useState<Aplicada | null>(null)
  const envio = useUnEnvioALaVez()
  const { enCurso } = envio

  const filas = useMemo(() => filasParaDibujar(trabajo, undefined, tablas), [trabajo, tablas])
  const previa = useVistaPrevia({ origenId, trabajo, filas })
  const guardado = useGuardadoDelEditor({
    origenId,
    leida,
    trabajo,
    filas,
    hayAbierta: abierta !== null,
    hayRechazo: previa.rechazo !== null,
    envio,
    alReemplazar: (formula) => {
      setTrabajo(formula)
      setAbierta(null)
      setAplicada(null)
    },
  })

  // Estables mientras no cambia `enCurso`: las filas de la planilla son `memo`.
  const cambiar = useCallback(
    (formula: Formula, deLaFila: Aplicada | null = null): boolean => {
      if (enCurso || soloLectura) return false
      setTrabajo(formula)
      setAplicada(deLaFila)
      return true
    },
    [enCurso, soloLectura],
  )
  const abrir = useCallback(
    (id: string) => {
      if (!enCurso && !soloLectura) setAbierta(id)
    },
    [enCurso, soloLectura],
  )
  const cerrar = useCallback(() => {
    setAbierta(null)
  }, [])
  return {
    trabajo,
    tablas,
    // Nada con texto sin aplicar ni guardándose: se puede operar sobre filas y bandas. En sólo lectura sigue libre (abrir una celda dice su motivo) y
    // `cambiar` no deja pasar nada.
    libre: abierta === null && !enCurso,
    soloLectura,
    enCurso,
    filas,
    ...previa,
    abierta,
    aplicada,
    guardado,
    abrir,
    cerrar,
    cambiar,
  }
}

export type EditorDeLaFormula = ReturnType<typeof useEditorDeLaFormula>
