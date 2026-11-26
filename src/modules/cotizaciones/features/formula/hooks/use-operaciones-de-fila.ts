'use client'

import { useMemo } from 'react'
import { avisar } from '@/shared/ui/toasts'
import type { Formula } from '../../../entities/formula'
import { eliminarFila } from '../../../entities/formula/eliminar-fila'
import { filaDe, type HojaDeLaPlanilla } from '../../../entities/formula/hoja-de-la-planilla'
import { cambiarValorDeConstante } from '../../../entities/formula/valor-en-la-planilla'
import { ponerEnBanda } from '../../../entities/formula/bandas'
import {
  duplicarFila,
  insertarFila,
  type LadoDeInsertar,
} from '../../../entities/formula/insertar-fila'
import { moverFila, type DestinoDeMover } from '../../../entities/formula/mover-fila'
import { sumasDeBandaAlDia } from '../../../entities/formula/sumas-de-banda'
import { cambiarDecimales } from '../../../entities/formula/decimales-de-la-fila'
import { cambiarTipo, type PedidoDeTipo } from '../../../entities/formula/tipo-de-celda'
import {
  indiceDeUsos,
  motivoParaNoEliminar,
  usosDe,
  type ContextoDeUsos,
} from '../../../entities/formula/usos-de-la-fila'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'
import { useDeshacer } from './use-deshacer'
import { ESPERA_A_LA_FILA } from './use-guardar-borrador.soporte'

type Args = {
  editor: EditorDeLaFormula
  hoja: HojaDeLaPlanilla
  // La hoja y la tarjeta de trabajo: lo que no deja eliminar una fila (D8).
  usos: ContextoDeUsos
  // Una fila nueva (insertada o duplicada): la planilla la elige y, si se insertó, abre su concepto.
  alCrear: (id: string, insertada: boolean) => void
}

// Insertar, duplicar, eliminar (con «Deshacer»), mover, poner en una banda, cambiar el tipo o los decimales y vaciar una fila de la fórmula de trabajo (D7, D8, D10, D12, D13).
// Nada con una celda en edición ni mientras se guarda: lo dice un aviso. Un rechazo se dice con su motivo y la fórmula no cambia. Lo que cambia las filas de una
// banda pone al día las filas que la suman (`sumasDeBandaAlDia()`).
export function useOperacionesDeFila({ editor, hoja, usos, alCrear }: Args) {
  const { trabajo, libre, tablas } = editor
  const cambiar = (formula: Formula): boolean => {
    const r = sumasDeBandaAlDia(trabajo, formula, tablas ?? undefined)
    if (r.ok) return editor.cambiar(r.formula)
    avisar(r.mensaje)
    return false
  }
  const indice = useMemo(() => indiceDeUsos(trabajo, hoja), [trabajo, hoja])
  const conDeshacer = useDeshacer(editor)
  const puede = (): boolean => {
    if (!libre) avisar(ESPERA_A_LA_FILA)
    return libre
  }
  const conResultado = (r: { ok: true; formula: Formula } | { ok: false; mensaje: string }) => {
    if (r.ok) return cambiar(r.formula)
    avisar(r.mensaje)
    return false
  }
  return {
    insertar: (junto: number | null, lado: LadoDeInsertar) => {
      if (!puede()) return
      const r = insertarFila(trabajo, { junto, lado }, hoja)
      if (cambiar(r.formula)) alCrear(r.id, true)
    },
    duplicar: (numero: number) => {
      if (!puede()) return
      const r = duplicarFila(trabajo, numero, { tablas, hoja })
      if (r.ok && cambiar(r.formula)) alCrear(r.id, false)
      else if (!r.ok) avisar(r.mensaje)
    },
    motivoParaEliminar: (numero: number) =>
      motivoParaNoEliminar(usosDe(trabajo, indice, numero, usos)),
    eliminar: (numero: number) => {
      if (!puede()) return
      const r = eliminarFila(trabajo, numero, usos, { hoja, indice })
      if (r.ok) conDeshacer(r.formula, `Se eliminó «${filaDe(hoja, numero)?.nodo.etiqueta ?? ''}».`)
      else avisar(r.mensaje)
    },
    mover: (numero: number, destino: DestinoDeMover) =>
      puede() && conResultado(moverFila(trabajo, numero, destino, { hoja, indice })),
    // Arrastrar: mueve y, si cae en otra banda (o fuera de toda banda), la pone ahí.
    moverABanda: (numero: number, destino: DestinoDeMover, grupo: string | null) => {
      if (!puede()) return
      const movida = moverFila(trabajo, numero, destino, { hoja, indice })
      if (!movida.ok) return void avisar(movida.mensaje)
      const id = filaDe(hoja, numero)?.id ?? ''
      const enBanda = ponerEnBanda(movida.formula, id, grupo)
      if (!enBanda.ok) avisar(enBanda.mensaje)
      cambiar(enBanda.ok ? enBanda.formula : movida.formula)
    },
    ponerEnBanda: (id: string, grupo: string | null) =>
      puede() && conResultado(ponerEnBanda(trabajo, id, grupo)),
    // El motivo si no se pudo (lo dice el panel del tipo de celda), o nulo.
    cambiarTipo: (numero: number, pedido: PedidoDeTipo): string | null => {
      if (!libre) return ESPERA_A_LA_FILA
      const r = cambiarTipo(trabajo, numero, pedido, hoja)
      if (!r.ok) return r.mensaje
      const alDia = sumasDeBandaAlDia(trabajo, r.formula, tablas ?? undefined)
      if (!alDia.ok) return alDia.mensaje
      return editor.cambiar(alDia.formula) ? null : ESPERA_A_LA_FILA
    },
    // Los «Decimales» de la fila (`null`: «Automático»); el motivo si no se pudo (lo dice su panel), o nulo. No cambia el cálculo: ninguna suma de banda.
    cambiarDecimales: (numero: number, decimales: number | null): string | null => {
      if (!libre) return ESPERA_A_LA_FILA
      const r = cambiarDecimales(trabajo, numero, decimales, hoja)
      if (!r.ok) return r.mensaje
      return editor.cambiar(r.formula) ? null : ESPERA_A_LA_FILA
    },
    // Supr en un valor fijo o en un %: lo pone en 0 (la fila no se borra).
    vaciar: (id: string) => puede() && conResultado(cambiarValorDeConstante(trabajo, id, 0)),
  }
}

export type OperacionesDeFila = ReturnType<typeof useOperacionesDeFila>
