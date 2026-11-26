'use client'

import { useEffect, useMemo, useState } from 'react'
import type { HojaDeLaPlanilla } from '../../../entities/formula/hoja-de-la-planilla'
import {
  resultadoAlLado,
  type CifraAlLado,
  type PedidoDelResultado,
} from '../../../entities/formula/resultado-al-lado'
import type { UnidadDeEjemplo } from '../../../entities/formula/unidad-de-ejemplo'
import type { PropsDeLaPlanilla } from '../components/planilla/tipos'
import type { CalculoDeLaPlanilla } from './use-calculo-de-la-planilla'
import type { EdicionDeLaCelda } from './use-edicion-con-referencias'

// Cuánto se espera tras la última tecla antes de calcular el resultado al lado.
export const PAUSA_DEL_RESULTADO_MS = 150

type Args = {
  edicion: { edicion: Pick<EdicionDeLaCelda, 'id' | 'col' | 'texto'> | null }
  editor: Pick<PropsDeLaPlanilla['editor'], 'trabajo' | 'tablas' | 'lectura'>
  hoja: HojaDeLaPlanilla
  unidad: UnidadDeEjemplo
  calculo: Pick<CalculoDeLaPlanilla, 'modo' | 'locale'>
}

type Calculado = { pedido: PedidoDelResultado; cifra: CifraAlLado | null }

// El resultado al lado de la C que se escribe (D11 de la fórmula fácil): `resultadoAlLado()` una vez por pausa, nunca por tecla. El pedido es la clave (lo
// tipeado, la fila, la unidad, el modo y la fórmula de trabajo): sólo se muestra la cifra calculada para el pedido de ahora, así nunca queda una cifra vieja
// mientras se tipea ni tras aplicar. Sin lo de prueba leído, nada.
export function useResultadoAlLado({ edicion, editor, hoja, unidad, calculo }: Args) {
  const e = edicion.edicion
  const { modo, locale } = calculo
  const lectura = editor.lectura
  const id = e?.id ?? null
  const col = e?.col ?? null
  const texto = e?.texto ?? null
  const pedido = useMemo((): PedidoDelResultado | null => {
    if (id === null || col !== 'C' || texto === null || lectura.tipo !== 'lista') return null
    return {
      formula: editor.trabajo,
      hoja,
      id,
      col,
      texto,
      locale,
      tablas: editor.tablas,
      terreno: lectura.terreno,
      unidad,
      modo,
    }
  }, [id, col, texto, lectura, editor.trabajo, editor.tablas, hoja, locale, unidad, modo])
  const [calculado, setCalculado] = useState<Calculado | null>(null)
  useEffect(() => {
    if (pedido === null) return
    const t = setTimeout(() => {
      setCalculado({ pedido, cifra: resultadoAlLado(pedido) })
    }, PAUSA_DEL_RESULTADO_MS)
    return () => {
      clearTimeout(t)
    }
  }, [pedido])
  return {
    // Si la fila que se escribe es una C: la caja del resultado está aunque esté vacía (D12).
    enC: col === 'C',
    cifra: calculado !== null && calculado.pedido === pedido ? calculado.cifra : null,
  }
}

export type ResultadoDeLaEdicion = ReturnType<typeof useResultadoAlLado>
